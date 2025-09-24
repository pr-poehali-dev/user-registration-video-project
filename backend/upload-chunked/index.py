import json
import os
import jwt
import psycopg2
import base64
import hashlib
import tempfile
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
    Business: Handle chunked video upload for large files (>100MB)
    Args: event with httpMethod, headers (X-Auth-Token), body with chunk data
    Returns: Upload status, next chunk info, or final upload completion
    '''
    print(f"Chunked upload handler called with method: {event.get('httpMethod', 'UNKNOWN')}")
    method: str = event.get('httpMethod', 'GET')
    
    # Handle CORS OPTIONS request
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-Auth-Token',
                'Access-Control-Max-Age': '86400'
            },
            'isBase64Encoded': False,
            'body': json.dumps({})
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
        if not db_url:
            return {
                'statusCode': 500,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'isBase64Encoded': False,
                'body': json.dumps({'error': 'Database configuration missing'})
            }
            
        conn = psycopg2.connect(db_url)
        cursor = conn.cursor()
        
        if method == 'POST':
            body_data = json.loads(event.get('body', '{}'))
            action = body_data.get('action', 'upload_chunk')
            
            if action == 'start_upload':
                # Initialize new chunked upload
                upload_id = body_data.get('upload_id')
                total_size = body_data.get('total_size', 0)
                total_chunks = body_data.get('total_chunks', 0)
                filename = body_data.get('filename', 'video.mp4')
                title = body_data.get('title', '')
                comments = body_data.get('comments', '')
                
                if not upload_id or not total_size or not total_chunks:
                    return {
                        'statusCode': 400,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'isBase64Encoded': False,
                        'body': json.dumps({'error': 'Missing upload parameters'})
                    }
                
                # Create upload session record
                cursor.execute("""
                    INSERT INTO chunked_uploads 
                    (upload_id, user_id, filename, title, comments, total_size, total_chunks, status)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, 'active')
                    ON CONFLICT (upload_id) DO UPDATE SET
                        total_size = EXCLUDED.total_size,
                        total_chunks = EXCLUDED.total_chunks,
                        status = 'active'
                """, (upload_id, user_id, filename, title, comments, total_size, total_chunks))
                
                conn.commit()
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'isBase64Encoded': False,
                    'body': json.dumps({
                        'success': True,
                        'upload_id': upload_id,
                        'next_chunk': 0,
                        'message': 'Upload session initialized'
                    })
                }
                
            elif action == 'upload_chunk':
                # Upload individual chunk
                upload_id = body_data.get('upload_id')
                chunk_index = body_data.get('chunk_index', 0)
                chunk_data = body_data.get('chunk_data', '')  # base64 encoded chunk
                chunk_hash = body_data.get('chunk_hash', '')
                
                if not upload_id or not chunk_data:
                    return {
                        'statusCode': 400,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'isBase64Encoded': False,
                        'body': json.dumps({'error': 'Missing chunk data'})
                    }
                
                # Verify upload session exists
                cursor.execute("""
                    SELECT total_chunks, status FROM chunked_uploads 
                    WHERE upload_id = %s AND user_id = %s
                """, (upload_id, user_id))
                
                upload_info = cursor.fetchone()
                if not upload_info:
                    return {
                        'statusCode': 404,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'isBase64Encoded': False,
                        'body': json.dumps({'error': 'Upload session not found'})
                    }
                
                total_chunks, status = upload_info
                if status != 'active':
                    return {
                        'statusCode': 400,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'isBase64Encoded': False,
                        'body': json.dumps({'error': 'Upload session not active'})
                    }
                
                # Decode and verify chunk
                try:
                    chunk_bytes = base64.b64decode(chunk_data)
                    if chunk_hash:
                        actual_hash = hashlib.md5(chunk_bytes).hexdigest()
                        if actual_hash != chunk_hash:
                            return {
                                'statusCode': 400,
                                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                                'isBase64Encoded': False,
                                'body': json.dumps({'error': 'Chunk verification failed'})
                            }
                except Exception as e:
                    return {
                        'statusCode': 400,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'isBase64Encoded': False,
                        'body': json.dumps({'error': 'Invalid chunk data'})
                    }
                
                # Store chunk
                cursor.execute("""
                    INSERT INTO upload_chunks (upload_id, chunk_index, chunk_data)
                    VALUES (%s, %s, %s)
                    ON CONFLICT (upload_id, chunk_index) DO UPDATE SET chunk_data = EXCLUDED.chunk_data
                """, (upload_id, chunk_index, chunk_bytes))
                
                conn.commit()
                
                # Check if all chunks uploaded
                cursor.execute("""
                    SELECT COUNT(*) FROM upload_chunks WHERE upload_id = %s
                """, (upload_id,))
                uploaded_chunks = cursor.fetchone()[0]
                
                if uploaded_chunks >= total_chunks:
                    # All chunks uploaded, assemble final video
                    return assemble_video(cursor, conn, upload_id, user_id)
                else:
                    return {
                        'statusCode': 200,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'isBase64Encoded': False,
                        'body': json.dumps({
                            'success': True,
                            'upload_id': upload_id,
                            'chunks_uploaded': uploaded_chunks,
                            'chunks_total': total_chunks,
                            'next_chunk': uploaded_chunks,
                            'progress': (uploaded_chunks / total_chunks) * 100
                        })
                    }
            
        return {
            'statusCode': 405,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'isBase64Encoded': False,
            'body': json.dumps({'error': 'Method not allowed'})
        }
    
    except Exception as e:
        print(f"Upload error: {str(e)}")
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


def assemble_video(cursor, conn, upload_id: str, user_id: str) -> Dict[str, Any]:
    '''Assemble all chunks into final video and save as lead'''
    try:
        # Get upload metadata
        cursor.execute("""
            SELECT filename, title, comments, total_size FROM chunked_uploads 
            WHERE upload_id = %s AND user_id = %s
        """, (upload_id, user_id))
        
        upload_meta = cursor.fetchone()
        if not upload_meta:
            raise Exception("Upload metadata not found")
        
        filename, title, comments, total_size = upload_meta
        
        # Get all chunks ordered by index
        cursor.execute("""
            SELECT chunk_data FROM upload_chunks 
            WHERE upload_id = %s 
            ORDER BY chunk_index ASC
        """, (upload_id,))
        
        chunks = cursor.fetchall()
        if not chunks:
            raise Exception("No chunks found")
        
        # Assemble video data
        video_data = b''
        for chunk_row in chunks:
            video_data += chunk_row[0]
        
        print(f"Assembled video size: {len(video_data)} bytes")
        
        # Save as final lead
        cursor.execute("""
            INSERT INTO video_leads 
            (user_id, title, comments, video_data, video_filename, video_content_type)
            VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING id, created_at
        """, (user_id, title, comments, video_data, filename, 'video/mp4'))
        
        lead_id, created_at = cursor.fetchone()
        
        # Mark upload as completed and cleanup chunks
        cursor.execute("UPDATE chunked_uploads SET status = 'completed' WHERE upload_id = %s", (upload_id,))
        cursor.execute("DELETE FROM upload_chunks WHERE upload_id = %s", (upload_id,))
        
        conn.commit()
        
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'isBase64Encoded': False,
            'body': json.dumps({
                'success': True,
                'lead_id': lead_id,
                'upload_complete': True,
                'final_size': len(video_data),
                'created_at': created_at.strftime('%d.%m.%Y %H:%M'),
                'message': 'Video successfully uploaded and saved'
            })
        }
        
    except Exception as e:
        print(f"Assembly error: {str(e)}")
        raise e