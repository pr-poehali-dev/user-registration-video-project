import json
import os
import jwt
import psycopg2
from typing import Dict, Any, Optional

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Business: Admin panel API for viewing all user data and videos
    Args: event with httpMethod, headers with X-Auth-Token
    Returns: All users data with their videos and comments
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
        
        # Verify JWT token and check admin role
        jwt_secret = os.environ.get('JWT_SECRET', 'default-secret-change-in-production')
        
        try:
            payload = jwt.decode(auth_token, jwt_secret, algorithms=['HS256'])
            user_role = payload.get('role')
            
            if user_role != 'admin':
                return {
                    'statusCode': 403,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'isBase64Encoded': False,
                    'body': json.dumps({'error': 'Access denied. Admin role required'})
                }
        except jwt.InvalidTokenError:
            return {
                'statusCode': 401,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'isBase64Encoded': False,
                'body': json.dumps({'error': 'Invalid token'})
            }
        
        # Connect to database
        db_url = os.environ.get('DATABASE_URL')
        conn = psycopg2.connect(db_url)
        cursor = conn.cursor()
        
        # Get all users with their leads
        cursor.execute("""
            SELECT 
                u.id as user_id,
                u.name as user_name, 
                u.email as user_email,
                u.created_at as user_created_at,
                vl.id as lead_id,
                vl.title as lead_title,
                vl.comments as lead_comments,
                vl.created_at as lead_created_at,
                vl.video_filename
            FROM users u
            LEFT JOIN video_leads vl ON u.id = vl.user_id
            ORDER BY u.created_at DESC, vl.created_at DESC
        """)
        
        results = cursor.fetchall()
        
        # Organize data by users
        users_data = {}
        
        for row in results:
            user_id, user_name, user_email, user_created_at, lead_id, lead_title, lead_comments, lead_created_at, video_filename = row
            
            # Create user entry if not exists
            if user_id not in users_data:
                users_data[user_id] = {
                    'id': user_id,
                    'name': user_name,
                    'email': user_email,
                    'created_at': user_created_at.isoformat() if user_created_at else None,
                    'leads': []
                }
            
            # Add lead if exists
            if lead_id:
                lead_data = {
                    'id': lead_id,
                    'title': lead_title,
                    'comments': lead_comments,
                    'created_at': lead_created_at.isoformat() if lead_created_at else None,
                    'video_filename': video_filename,
                    'has_video': bool(video_filename)
                }
                users_data[user_id]['leads'].append(lead_data)
        
        # Convert to list
        users_list = list(users_data.values())
        
        # Get total statistics
        cursor.execute("SELECT COUNT(*) FROM users")
        total_users = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM video_leads")
        total_leads = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM video_leads WHERE video_filename IS NOT NULL")
        total_videos = cursor.fetchone()[0]
        
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'isBase64Encoded': False,
            'body': json.dumps({
                'success': True,
                'statistics': {
                    'total_users': total_users,
                    'total_leads': total_leads,
                    'total_videos': total_videos
                },
                'users': users_list
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