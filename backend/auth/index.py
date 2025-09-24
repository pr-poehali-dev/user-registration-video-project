import json
import os
import hashlib
import jwt
import psycopg2
from datetime import datetime, timedelta
from typing import Dict, Any, Optional

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Business: Handle user authentication (login/register) with JWT tokens
    Args: event with httpMethod, body containing email/password/name
    Returns: JWT token on success or error message
    '''
    method: str = event.get('httpMethod', 'GET')
    
    # Handle CORS OPTIONS request
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-User-Id, X-Auth-Token',
                'Access-Control-Max-Age': '86400'
            },
            'isBase64Encoded': False,
            'body': ''
        }
    
    if method != 'POST':
        return {
            'statusCode': 405,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'isBase64Encoded': False,
            'body': json.dumps({'error': 'Method not allowed'})
        }
    
    try:
        body_data = json.loads(event.get('body', '{}'))
        action = body_data.get('action')  # 'login' or 'register'
        email = body_data.get('email', '').strip().lower()
        password = body_data.get('password', '')
        name = body_data.get('name', '').strip()
        
        if not action or not email or not password:
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'isBase64Encoded': False,
                'body': json.dumps({'error': 'Missing required fields'})
            }
        
        # Connect to database
        db_url = os.environ.get('DATABASE_URL')
        jwt_secret = os.environ.get('JWT_SECRET', 'default-secret-change-in-production')
        
        conn = psycopg2.connect(db_url)
        cursor = conn.cursor()
        
        if action == 'register':
            if not name:
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'isBase64Encoded': False,
                    'body': json.dumps({'error': 'Name is required for registration'})
                }
            
            # Check if user already exists
            cursor.execute("SELECT id FROM users WHERE email = %s", (email,))
            if cursor.fetchone():
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'isBase64Encoded': False,
                    'body': json.dumps({'error': 'User with this email already exists'})
                }
            
            # Hash password
            password_hash = hashlib.sha256(password.encode()).hexdigest()
            
            # Create new user
            cursor.execute(
                "INSERT INTO users (email, name, password_hash) VALUES (%s, %s, %s) RETURNING id",
                (email, name, password_hash)
            )
            user_id = cursor.fetchone()[0]
            conn.commit()
            
            # Generate JWT token
            token_payload = {
                'user_id': user_id,
                'email': email,
                'name': name,
                'exp': datetime.utcnow() + timedelta(days=30)
            }
            token = jwt.encode(token_payload, jwt_secret, algorithm='HS256')
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'isBase64Encoded': False,
                'body': json.dumps({
                    'success': True,
                    'token': token,
                    'user': {
                        'id': user_id,
                        'email': email,
                        'name': name
                    }
                })
            }
        
        elif action == 'login':
            # Hash provided password
            password_hash = hashlib.sha256(password.encode()).hexdigest()
            
            # Check credentials
            cursor.execute(
                "SELECT id, name, email FROM users WHERE email = %s AND password_hash = %s",
                (email, password_hash)
            )
            user = cursor.fetchone()
            
            if not user:
                return {
                    'statusCode': 401,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'isBase64Encoded': False,
                    'body': json.dumps({'error': 'Invalid email or password'})
                }
            
            user_id, user_name, user_email = user
            
            # Generate JWT token
            token_payload = {
                'user_id': user_id,
                'email': user_email,
                'name': user_name,
                'exp': datetime.utcnow() + timedelta(days=30)
            }
            token = jwt.encode(token_payload, jwt_secret, algorithm='HS256')
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'isBase64Encoded': False,
                'body': json.dumps({
                    'success': True,
                    'token': token,
                    'user': {
                        'id': user_id,
                        'email': user_email,
                        'name': user_name
                    }
                })
            }
        
        else:
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'isBase64Encoded': False,
                'body': json.dumps({'error': 'Invalid action'})
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