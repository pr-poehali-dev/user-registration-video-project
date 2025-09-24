import json
import os
import jwt
import psycopg2
import base64
from typing import Dict, Any, Optional

def verify_token(token: str) -> Optional[Dict[str, Any]]:
    '''Verify JWT token and return user data'''
    try:
        jwt_secret = os.environ.get('JWT_SECRET', 'default-secret-change-in-production')
        decoded = jwt.decode(token, jwt_secret, algorithms=['HS256'])
        return decoded
    except:
        return None

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Business: Admin video access - serve any video file from database
    Args: event with httpMethod, query params (id), headers (X-Auth-Token)
    Returns: Video file data as base64 or error
    '''
    method: str = event.get('httpMethod', 'GET')
    
    # Handle CORS OPTIONS request
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-Auth-Token',
                'Access-Control-Max-Age': '86400'
            },
            'isBase64Encoded': False,
            'body': ''
        }
    
    if method != 'GET':
        return {
            'statusCode': 405,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'isBase64Encoded': False,
            'body': json.dumps({'error': 'Method not allowed'})
        }
    
    try:
        # Get auth token from headers
        headers = event.get('headers', {})
        auth_token = headers.get('X-Auth-Token') or headers.get('x-auth-token')
        
        if not auth_token:
            return {
                'statusCode': 401,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'isBase64Encoded': False,
                'body': json.dumps({'error': 'Authentication token required'})
            }
        
        # Verify token and check admin role
        user_data = verify_token(auth_token)
        if not user_data:
            return {
                'statusCode': 401,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'isBase64Encoded': False,
                'body': json.dumps({'error': 'Invalid token'})
            }
        
        user_role = user_data.get('role', 'user')
        if user_role != 'admin':
            return {
                'statusCode': 403,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'isBase64Encoded': False,
                'body': json.dumps({'error': 'Access denied. Admin role required'})
            }
        
        # Get lead ID from query parameters
        query_params = event.get('queryStringParameters', {}) or {}
        lead_id = query_params.get('id')
        
        if not lead_id:
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'isBase64Encoded': False,
                'body': json.dumps({'error': 'Lead ID required'})
            }
        
        # Connect to database
        db_url = os.environ.get('DATABASE_URL')
        conn = psycopg2.connect(db_url)
        cursor = conn.cursor()
        
        # Admin can access any video
        cursor.execute("""
            SELECT video_data, video_content_type, video_filename
            FROM video_leads 
            WHERE id = %s
        """, (lead_id,))
        
        result = cursor.fetchone()
        if not result:
            return {
                'statusCode': 404,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'isBase64Encoded': False,
                'body': json.dumps({'error': 'Video not found'})
            }
        
        video_data, content_type, filename = result
        
        if not video_data:
            return {
                'statusCode': 404,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'isBase64Encoded': False,
                'body': json.dumps({'error': 'No video data found'})
            }
        
        # Return video as base64 data URL
        video_base64 = base64.b64encode(video_data).decode('utf-8')
        data_url = f"data:{content_type};base64,{video_base64}"
        
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'isBase64Encoded': False,
            'body': json.dumps({
                'video_url': data_url,
                'filename': filename,
                'content_type': content_type
            })
        }
    
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'isBase64Encoded': False,
            'body': json.dumps({'error': f'Server error: {str(e)}'})
        }
    
    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'conn' in locals():
            conn.close()