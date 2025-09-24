import json
import os
import jwt
import psycopg2
import base64
from datetime import datetime
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
    Business: Manage video leads (create, retrieve) with user authentication
    Args: event with httpMethod, headers (X-Auth-Token), body with video/comments data
    Returns: Lead data or list of user leads
    '''
    method: str = event.get('httpMethod', 'GET')
    
    # Handle CORS OPTIONS request
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-Auth-Token',
                'Access-Control-Max-Age': '86400'
            },
            'body': ''
        }
    
    # Verify authentication
    headers = event.get('headers', {})
    auth_token = headers.get('X-Auth-Token') or headers.get('x-auth-token')
    
    if not auth_token:
        return {
            'statusCode': 401,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'isBase64Encoded': False,
            'body': json.dumps({'error': 'Authentication required'})
        }
    
    user_data = verify_token(auth_token)
    if not user_data:
        return {
            'statusCode': 401,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'isBase64Encoded': False,
            'body': json.dumps({'error': 'Invalid token'})
        }
    
    user_id = user_data['user_id']
    
    try:
        # Connect to database
        db_url = os.environ.get('DATABASE_URL')
        conn = psycopg2.connect(db_url)
        cursor = conn.cursor()
        
        if method == 'GET':
            # Get user's leads
            cursor.execute("""
                SELECT id, title, comments, video_filename, video_content_type, created_at 
                FROM video_leads 
                WHERE user_id = %s 
                ORDER BY created_at DESC
            """, (user_id,))
            
            leads = []
            for row in cursor.fetchall():
                lead_id, title, comments, filename, content_type, created_at = row
                leads.append({
                    'id': lead_id,
                    'title': title,
                    'comments': comments,
                    'video_filename': filename,
                    'video_content_type': content_type,
                    'created_at': created_at.strftime('%d.%m.%Y %H:%M') if created_at else '',
                    'video_url': f'/backend/leads/video/{lead_id}'  # URL to get video data
                })
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'isBase64Encoded': False,
                'body': json.dumps({'leads': leads})
            }
        
        elif method == 'POST':
            # Create new lead
            body_data = json.loads(event.get('body', '{}'))
            title = body_data.get('title', '').strip()
            comments = body_data.get('comments', '').strip()
            video_base64 = body_data.get('video_data', '')  # Base64 encoded video
            video_filename = body_data.get('video_filename', 'recording.webm')
            video_content_type = body_data.get('video_content_type', 'video/webm')
            
            print(f"Receiving lead: title='{title[:50]}...', comments_len={len(comments)}, video_len={len(video_base64)}, content_type='{video_content_type}', filename='{video_filename}'")
            
            if not title or not comments or not video_base64:
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'isBase64Encoded': False,
                    'body': json.dumps({'error': 'Missing required fields'})
                }
            
            # Decode base64 video data
            try:
                video_data = base64.b64decode(video_base64)
                print(f"Video decoded successfully, size: {len(video_data)} bytes ({len(video_data)/1024/1024:.2f} MB)")
            except Exception as e:
                print(f"Error decoding video data: {e}")
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'isBase64Encoded': False,
                    'body': json.dumps({'error': f'Invalid video data: {str(e)}'})
                }
            
            # Save to database
            try:
                cursor.execute("""
                    INSERT INTO video_leads 
                    (user_id, title, comments, video_data, video_filename, video_content_type)
                    VALUES (%s, %s, %s, %s, %s, %s)
                    RETURNING id, created_at
                """, (user_id, title, comments, video_data, video_filename, video_content_type))
                
                lead_id, created_at = cursor.fetchone()
                conn.commit()
                print(f"Lead saved successfully: id={lead_id}, created_at={created_at}")
            except Exception as e:
                conn.rollback()
                print(f"Database error: {e}")
                return {
                    'statusCode': 500,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'isBase64Encoded': False,
                    'body': json.dumps({'error': f'Database error: {str(e)}'})
                }
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'isBase64Encoded': False,
                'body': json.dumps({
                    'success': True,
                    'lead_id': lead_id,
                    'created_at': created_at.strftime('%d.%m.%Y %H:%M')
                })
            }
        
        elif method == 'DELETE':
            # Delete lead (admin only)
            if user_data.get('role') != 'admin':
                return {
                    'statusCode': 403,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Admin access required'})
                }
            
            # Get lead_id from query parameters
            query_params = event.get('queryStringParameters') or {}
            lead_id = query_params.get('lead_id')
            
            if not lead_id:
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'lead_id parameter required'})
                }
            
            # Check if lead exists
            cursor.execute("SELECT id, user_id FROM video_leads WHERE id = %s", (lead_id,))
            lead_info = cursor.fetchone()
            
            if not lead_info:
                return {
                    'statusCode': 404,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Lead not found'})
                }
            
            # Delete the lead
            cursor.execute("DELETE FROM video_leads WHERE id = %s", (lead_id,))
            conn.commit()
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'isBase64Encoded': False,
                'body': json.dumps({
                    'success': True,
                    'message': 'Lead deleted successfully',
                    'deleted_lead_id': int(lead_id)
                })
            }
        
        else:
            return {
                'statusCode': 405,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'isBase64Encoded': False,
                'body': json.dumps({'error': 'Method not allowed'})
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