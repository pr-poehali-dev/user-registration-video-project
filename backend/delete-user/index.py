import json
import os
import re
from typing import Dict, Any
import psycopg2
from psycopg2.extras import RealDictCursor
import jwt

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Business: Admin endpoint to delete user accounts and all related data
    Args: event - HTTP request with user_id in body
          context - execution context
    Returns: Success/error response
    '''
    method = event.get('httpMethod', 'GET')
    
    # Handle CORS OPTIONS request
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-Auth-Token',
                'Access-Control-Max-Age': '86400'
            },
            'body': ''
        }
    
    if method != 'DELETE':
        return {
            'statusCode': 405,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Method not allowed'})
        }
    
    # Parse request body first
    body_str = event.get('body', '{}')
    if not body_str or body_str.strip() == '':
        body_str = '{}'
    
    try:
        body_data = json.loads(body_str)
    except json.JSONDecodeError:
        body_data = {}
    
    user_id = body_data.get('user_id')
    if not user_id:
        return {
            'statusCode': 400,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'user_id is required'})
        }
    
    # Validate user_id format (should be UUID or integer)
    if not re.match(r'^[a-f0-9\-]+$|^\d+$', str(user_id)):
        return {
            'statusCode': 400,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Invalid user_id format'})
        }
    
    # Check admin authorization - use same token as other admin functions
    headers = event.get('headers', {})
    auth_token = headers.get('X-Auth-Token') or headers.get('x-auth-token')
    
    if not auth_token:
        return {
            'statusCode': 401,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Authentication token required'})
        }
    
    # Verify JWT token and check admin role
    jwt_secret = os.environ.get('JWT_SECRET', 'default-secret-change-in-production')
    
    try:
        payload = jwt.decode(auth_token, jwt_secret, algorithms=['HS256'])
        user_role = payload.get('role')
        
        if user_role != 'admin':
            return {
                'statusCode': 403,
                'headers': {'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Admin access required'})
            }
    except jwt.InvalidTokenError:
        return {
            'statusCode': 401,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Invalid authentication token'})
        }
    
    try:
        # Connect to database
        database_url = os.environ.get('DATABASE_URL')
        conn = psycopg2.connect(database_url)
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        # First, check if user exists (using simple query protocol)
        cursor.execute(f"SELECT id, name, email FROM t_p72874800_user_registration_vi.users WHERE id = {user_id}")
        user = cursor.fetchone()
        
        if not user:
            return {
                'statusCode': 404,
                'headers': {'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'User not found'})
            }
        
        # Delete all related data in correct order (foreign key dependencies)
        # Delete video_leads first
        cursor.execute(f"DELETE FROM t_p72874800_user_registration_vi.video_leads WHERE user_id = {user_id}")
        leads_deleted = cursor.rowcount
        
        # Delete chunked uploads if they exist
        cursor.execute(f"DELETE FROM t_p72874800_user_registration_vi.upload_chunks WHERE upload_id IN (SELECT id FROM t_p72874800_user_registration_vi.chunked_uploads WHERE user_id = {user_id})")
        chunks_deleted = cursor.rowcount
        
        cursor.execute(f"DELETE FROM t_p72874800_user_registration_vi.chunked_uploads WHERE user_id = {user_id}")
        uploads_deleted = cursor.rowcount
        
        # Finally delete the user
        cursor.execute(f"DELETE FROM t_p72874800_user_registration_vi.users WHERE id = {user_id}")
        
        # Commit all changes
        conn.commit()
        
        result = {
            'success': True,
            'message': f'User {user["name"]} ({user["email"]}) deleted successfully',
            'deleted_data': {
                'user_id': user_id,
                'leads_deleted': leads_deleted,
                'chunks_deleted': chunks_deleted,
                'uploads_deleted': uploads_deleted
            }
        }
        
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            'body': json.dumps(result)
        }
        
    except psycopg2.Error as e:
        return {
            'statusCode': 500,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({
                'error': 'Database error',
                'details': str(e)
            })
        }
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({
                'error': 'Internal server error',
                'details': str(e)
            })
        }
    finally:
        if 'conn' in locals():
            conn.close()