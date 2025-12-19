from flask import Flask, request, jsonify, send_from_directory, send_file
from flask_cors import CORS
import random
import string
from twilio.rest import Client
import os
from datetime import datetime, timedelta
import json
from database import get_db, row_to_dict, rows_to_list

app = Flask(__name__, static_folder='.', static_url_path='')
CORS(app, resources={r"/api/*": {"origins": "*"}})  # Enable CORS for all API endpoints

# Twilio configuration - Get these from https://www.twilio.com/console
TWILIO_ACCOUNT_SID = os.environ.get('TWILIO_ACCOUNT_SID', 'YOUR_ACCOUNT_SID_HERE')
TWILIO_AUTH_TOKEN = os.environ.get('TWILIO_AUTH_TOKEN', 'YOUR_AUTH_TOKEN_HERE')
TWILIO_PHONE_NUMBER = os.environ.get('TWILIO_PHONE_NUMBER', 'YOUR_TWILIO_PHONE_HERE')  # e.g., +1234567890

# In-memory OTP storage (in production, use Redis or database)
otp_storage = {}

# PTT now uses database instead of memory

# Serve frontend files
@app.route('/')
def serve_index():
    """Serve the main app page"""
    return send_file('index.html')

@app.route('/<path:path>')
def serve_static(path):
    """Serve static files"""
    return send_from_directory('.', path)

def generate_otp():
    """Generate a 6-digit OTP"""
    # Fixed OTP for testing
    return '123456'

@app.route('/api/send-otp', methods=['POST'])
def send_otp():
    """Send OTP to the provided phone number"""
    try:
        data = request.json
        phone_number = data.get('phone_number')
        country_code = data.get('country_code', '+44')
        
        if not phone_number:
            return jsonify({'error': 'Phone number is required'}), 400
        
        # Format phone number
        full_phone = f"{country_code}{phone_number}"
        
        # Generate OTP
        otp = generate_otp()
        
        # Store OTP with expiry (5 minutes)
        otp_storage[full_phone] = {
            'otp': otp,
            'expiry': datetime.now() + timedelta(minutes=5)
        }
        
        # Send OTP via Twilio
        try:
            client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
            message = client.messages.create(
                body=f"Your Shomrim verification code is: {otp}\n\nThis code will expire in 5 minutes.",
                from_=TWILIO_PHONE_NUMBER,
                to=full_phone
            )
            
            return jsonify({
                'success': True,
                'message': 'OTP sent successfully',
                'message_sid': message.sid
            })
        except Exception as twilio_error:
            # For development/testing - log the OTP
            print(f"\n{'='*50}")
            print(f"DEVELOPMENT MODE - OTP for {full_phone}: {otp}")
            print(f"{'='*50}\n")
            
            # Return success anyway for testing
            return jsonify({
                'success': True,
                'message': 'OTP sent (dev mode)',
                'dev_otp': otp  # Only in development!
            })
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/verify-otp', methods=['POST'])
def verify_otp():
    """Verify the OTP entered by user"""
    try:
        data = request.json
        phone_number = data.get('phone_number')
        country_code = data.get('country_code', '+44')
        entered_otp = data.get('otp')
        
        if not phone_number or not entered_otp:
            return jsonify({'error': 'Phone number and OTP are required'}), 400
        
        # Format phone number
        full_phone = f"{country_code}{phone_number}"
        
        # Check if OTP exists
        if full_phone not in otp_storage:
            return jsonify({'error': 'No OTP found for this number'}), 404
        
        stored_data = otp_storage[full_phone]
        
        # Debug logging
        print(f"\n{'='*50}")
        print(f"VERIFY OTP - Phone: {full_phone}")
        print(f"VERIFY OTP - Entered: '{entered_otp}' (type: {type(entered_otp)})")
        print(f"VERIFY OTP - Stored: '{stored_data['otp']}' (type: {type(stored_data['otp'])})")
        print(f"VERIFY OTP - Match: {str(stored_data['otp']).strip() == str(entered_otp).strip()}")
        print(f"{'='*50}\n")
        
        # Check if OTP expired
        if datetime.now() > stored_data['expiry']:
            del otp_storage[full_phone]
            return jsonify({'error': 'OTP has expired'}), 400
        
        # Verify OTP - convert both to strings and strip whitespace
        if str(stored_data['otp']).strip() == str(entered_otp).strip():
            # OTP verified - remove from storage
            del otp_storage[full_phone]
            
            # Check if user already exists in database
            conn = get_db()
            cursor = conn.cursor()
            cursor.execute('SELECT * FROM users WHERE phone = ?', (full_phone,))
            existing_user = cursor.fetchone()
            conn.close()
            
            if existing_user:
                # Returning user - return their data
                user_data = row_to_dict(existing_user)
                return jsonify({
                    'success': True,
                    'message': 'OTP verified successfully',
                    'user': user_data,
                    'is_returning_user': True
                })
            else:
                # New user - no user data
                return jsonify({
                    'success': True,
                    'message': 'OTP verified successfully',
                    'is_returning_user': False
                })
        else:
            return jsonify({'error': 'Invalid OTP'}), 400
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({'status': 'healthy', 'service': 'Shomrim OTP API'})

# ========== USER ENDPOINTS ==========

@app.route('/api/users', methods=['POST'])
def create_user():
    """Create or update user"""
    try:
        data = request.json
        conn = get_db()
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT OR REPLACE INTO users (phone, name, email, callsign, role, avatar)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (data['phone'], data['name'], data.get('email'), data.get('callsign'), 
              data.get('role', 'Member'), data.get('avatar')))
        
        conn.commit()
        conn.close()
        
        return jsonify({'success': True, 'message': 'User saved'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/users/<phone>', methods=['GET'])
def get_user(phone):
    """Get user by phone"""
    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM users WHERE phone = ?', (phone,))
        user = row_to_dict(cursor.fetchone())
        conn.close()
        
        if user:
            return jsonify(user)
        else:
            return jsonify({'error': 'User not found'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ========== INCIDENT ENDPOINTS ==========

@app.route('/api/incidents', methods=['POST'])
def create_incident():
    """Create new incident"""
    try:
        import json
        data = request.json
        conn = get_db()
        cursor = conn.cursor()
        
        # Insert incident with full metadata
        cursor.execute('''
            INSERT INTO incidents (
                id, shcad, title, type, description, status, address, postcode,
                caller_name, caller_phone, caller_is_victim, caller_is_witness, metadata, created_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            data['id'], data['shcad'], data['title'], data['type'], data['description'],
            data.get('status', 'pending'), data.get('address'), data.get('postcode'),
            data['caller'].get('name'), data['caller'].get('phone'),
            data['caller'].get('isVictim', False), data['caller'].get('isWitness', False),
            json.dumps(data),  # Store full incident data as JSON
            data.get('created_by')
        ))
        
        # Add victims
        for victim in data.get('victims', []):
            cursor.execute('''
                INSERT INTO incident_participants (incident_id, type, name, phone, address, description)
                VALUES (?, 'victim', ?, ?, ?, ?)
            ''', (data['id'], victim['name'], victim.get('phone'), victim.get('address'), victim.get('description')))
        
        # Add witnesses
        for witness in data.get('witnesses', []):
            cursor.execute('''
                INSERT INTO incident_participants (incident_id, type, name, phone, address, description)
                VALUES (?, 'witness', ?, ?, ?, ?)
            ''', (data['id'], witness['name'], witness.get('phone'), witness.get('address'), witness.get('description')))
        
        # Add suspects
        for suspect in data.get('suspects', []):
            cursor.execute('''
                INSERT INTO incident_participants (incident_id, type, name, phone, address, description)
                VALUES (?, 'suspect', ?, ?, ?, ?)
            ''', (data['id'], suspect['name'], suspect.get('phone'), suspect.get('address'), suspect.get('description')))
        
        # Add police info if provided
        if data.get('policeInfo'):
            pi = data['policeInfo']
            cursor.execute('''
                INSERT INTO incident_police_info (incident_id, cad_ref, cris_ref, chs_ref, officer_name, officer_badge)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (data['id'], pi.get('cadRef'), pi.get('crisRef'), pi.get('chsRef'), 
                  pi.get('officerName'), pi.get('officerBadge')))
        
        # Add history entry
        cursor.execute('''
            INSERT INTO incident_history (incident_id, user_phone, action, details)
            VALUES (?, ?, 'created', ?)
        ''', (data['id'], data.get('created_by'), f"Incident created: {data['title']}"))
        
        conn.commit()
        conn.close()
        
        return jsonify({'success': True, 'id': data['id'], 'message': 'Incident created successfully'})
    except Exception as e:
        print(f"Error creating incident: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/incidents', methods=['GET'])
def get_incidents():
    """Get all incidents"""
    try:
        user_phone = request.args.get('user_phone')
        conn = get_db()
        cursor = conn.cursor()
        
        cursor.execute('SELECT * FROM incidents ORDER BY created_at DESC')
        incidents = rows_to_list(cursor.fetchall())
        
        # Get related data for each incident
        for incident in incidents:
            # Get participants
            cursor.execute('SELECT * FROM incident_participants WHERE incident_id = ?', (incident['id'],))
            participants = rows_to_list(cursor.fetchall())
            incident['victims'] = [p for p in participants if p['type'] == 'victim']
            incident['witnesses'] = [p for p in participants if p['type'] == 'witness']
            incident['suspects'] = [p for p in participants if p['type'] == 'suspect']
            
            # Get assignments
            cursor.execute('SELECT * FROM incident_assignments WHERE incident_id = ?', (incident['id'],))
            incident['assignedUsers'] = rows_to_list(cursor.fetchall())
            
            # Get notes
            cursor.execute('SELECT * FROM incident_notes WHERE incident_id = ? ORDER BY created_at', (incident['id'],))
            incident['notes'] = rows_to_list(cursor.fetchall())
            
            # Get history
            cursor.execute('SELECT * FROM incident_history WHERE incident_id = ? ORDER BY created_at', (incident['id'],))
            incident['history'] = rows_to_list(cursor.fetchall())
            
            # Get police info
            cursor.execute('SELECT * FROM incident_police_info WHERE incident_id = ?', (incident['id'],))
            police_info = row_to_dict(cursor.fetchone())
            incident['policeInfo'] = police_info if police_info else {}
            
            # Get arrests
            cursor.execute('SELECT * FROM incident_arrests WHERE incident_id = ?', (incident['id'],))
            incident['arrests'] = rows_to_list(cursor.fetchall())
        
        conn.close()
        return jsonify(incidents)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/incidents/<incident_id>', methods=['PUT'])
def update_incident(incident_id):
    """Update incident with full data"""
    try:
        data = request.json
        conn = get_db()
        cursor = conn.cursor()
        
        # Prepare update fields based on what's in the request
        update_fields = []
        params = []
        
        if 'status' in data:
            update_fields.append('status = ?')
            params.append(data['status'])
        
        if 'title' in data:
            update_fields.append('title = ?')
            params.append(data['title'])
            
        if 'description' in data:
            update_fields.append('description = ?')
            params.append(data['description'])
            
        if 'address' in data:
            update_fields.append('address = ?')
            params.append(data['address'])
            
        if 'postcode' in data:
            update_fields.append('postcode = ?')
            params.append(data['postcode'])
        
        # Always update timestamp
        update_fields.append('updated_at = CURRENT_TIMESTAMP')
        
        if update_fields:
            params.append(incident_id)
            cursor.execute(f'''
                UPDATE incidents 
                SET {', '.join(update_fields)}
                WHERE id = ?
            ''', params)
        
        # Store full incident data as JSON (for notes, assignments, etc.)
        import json
        if 'notes' in data or 'assignedUsers' in data or 'victims' in data or 'witnesses' in data or 'suspects' in data:
            # For now, we'll store the full incident JSON in a metadata field
            # You could create separate tables for notes, assignments, etc.
            cursor.execute('''
                UPDATE incidents 
                SET metadata = ?
                WHERE id = ?
            ''', (json.dumps(data), incident_id))
        
        conn.commit()
        conn.close()
        
        return jsonify({'success': True, 'message': 'Incident updated successfully'})
    except Exception as e:
        print(f"Error updating incident: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/incidents/<incident_id>/notes', methods=['POST'])
def add_note(incident_id):
    """Add note to incident"""
    try:
        data = request.json
        conn = get_db()
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO incident_notes (incident_id, user_phone, note, is_follow_up)
            VALUES (?, ?, ?, ?)
        ''', (incident_id, data['user_phone'], data['note'], data.get('isFollowUp', False)))
        
        conn.commit()
        conn.close()
        
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ========== CONTACT ENDPOINTS ==========

@app.route('/api/contacts', methods=['POST'])
def create_contact():
    """Create contact"""
    try:
        data = request.json
        conn = get_db()
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO contacts (name, phone, email, address, organization, notes, user_phone)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (data['name'], data.get('phone'), data.get('email'), data.get('address'),
              data.get('organization'), data.get('notes'), data['user_phone']))
        
        contact_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        return jsonify({'success': True, 'id': contact_id})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/contacts', methods=['GET'])
def get_contacts():
    """Get all contacts for user"""
    try:
        user_phone = request.args.get('user_phone')
        conn = get_db()
        cursor = conn.cursor()
        
        cursor.execute('SELECT * FROM contacts WHERE user_phone = ? ORDER BY name', (user_phone,))
        contacts = rows_to_list(cursor.fetchall())
        
        conn.close()
        return jsonify(contacts)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/contacts/<int:contact_id>', methods=['DELETE'])
def delete_contact(contact_id):
    """Delete contact"""
    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute('DELETE FROM contacts WHERE id = ?', (contact_id,))
        conn.commit()
        conn.close()
        
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({'status': 'healthy', 'service': 'Shomrim OTP API'})

# Duty/Patrol Status Endpoints
@app.route('/api/users/<phone>/duty-status', methods=['PUT'])
def update_duty_status(phone):
    """Update user's on-duty status"""
    try:
        data = request.json
        on_duty = data.get('on_duty', False)
        
        conn = get_db()
        cursor = conn.cursor()
        
        cursor.execute('''
            UPDATE users 
            SET on_duty = ?
            WHERE phone = ?
        ''', (on_duty, phone))
        
        conn.commit()
        conn.close()
        
        return jsonify({'success': True, 'on_duty': on_duty})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/users/<phone>/patrol-status', methods=['PUT'])
def update_patrol_status(phone):
    """Update user's on-patrol status"""
    try:
        data = request.json
        on_patrol = data.get('on_patrol', False)
        
        conn = get_db()
        cursor = conn.cursor()
        
        cursor.execute('''
            UPDATE users 
            SET on_patrol = ?
            WHERE phone = ?
        ''', (on_patrol, phone))
        
        conn.commit()
        conn.close()
        
        return jsonify({'success': True, 'on_patrol': on_patrol})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/users/on-duty', methods=['GET'])
def get_on_duty_users():
    """Get all users currently on duty"""
    try:
        conn = get_db()
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT * FROM users 
            WHERE on_duty = 1
            ORDER BY name
        ''')
        
        users = rows_to_list(cursor.fetchall())
        conn.close()
        
        return jsonify(users)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/users/on-patrol', methods=['GET'])
def get_on_patrol_users():
    """Get all users currently on patrol"""
    try:
        conn = get_db()
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT * FROM users 
            WHERE on_patrol = 1
            ORDER BY name
        ''')
        
        users = rows_to_list(cursor.fetchall())
        conn.close()
        
        return jsonify(users)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/users/by-role/<role>', methods=['GET'])
def get_users_by_role(role):
    """Get all users with a specific role"""
    try:
        conn = get_db()
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT * FROM users 
            WHERE role = ?
            ORDER BY name
        ''', (role,))
        
        users = rows_to_list(cursor.fetchall())
        conn.close()
        
        return jsonify(users)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Suspect Endpoints
@app.route('/api/suspects', methods=['GET'])
def get_suspects():
    """Get all suspects"""
    try:
        conn = get_db()
        cursor = conn.cursor()
        
        cursor.execute('SELECT * FROM suspects ORDER BY created_at DESC')
        suspects = rows_to_list(cursor.fetchall())
        conn.close()
        
        return jsonify(suspects)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/suspects', methods=['POST'])
def create_suspect():
    """Create a new suspect"""
    try:
        data = request.json
        
        conn = get_db()
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO suspects (
                name, alias, date_of_birth, physical_description, 
                photo, last_known_address, phone, email, 
                known_associates, criminal_history, notes, created_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            data.get('name'),
            data.get('alias'),
            data.get('date_of_birth'),
            data.get('physical_description'),
            data.get('photo'),
            data.get('last_known_address'),
            data.get('phone'),
            data.get('email'),
            data.get('known_associates'),
            data.get('criminal_history'),
            data.get('notes'),
            data.get('created_by')
        ))
        
        suspect_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        return jsonify({'success': True, 'id': suspect_id})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/suspects/<int:suspect_id>', methods=['PUT'])
def update_suspect(suspect_id):
    """Update a suspect"""
    try:
        data = request.json
        
        conn = get_db()
        cursor = conn.cursor()
        
        cursor.execute('''
            UPDATE suspects 
            SET name = ?, alias = ?, date_of_birth = ?, 
                physical_description = ?, photo = ?, 
                last_known_address = ?, phone = ?, email = ?,
                known_associates = ?, criminal_history = ?, 
                notes = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        ''', (
            data.get('name'),
            data.get('alias'),
            data.get('date_of_birth'),
            data.get('physical_description'),
            data.get('photo'),
            data.get('last_known_address'),
            data.get('phone'),
            data.get('email'),
            data.get('known_associates'),
            data.get('criminal_history'),
            data.get('notes'),
            suspect_id
        ))
        
        conn.commit()
        conn.close()
        
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/suspects/<int:suspect_id>', methods=['DELETE'])
def delete_suspect(suspect_id):
    """Delete a suspect"""
    try:
        conn = get_db()
        cursor = conn.cursor()
        
        cursor.execute('DELETE FROM suspects WHERE id = ?', (suspect_id,))
        
        conn.commit()
        conn.close()
        
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# Vehicle Endpoints
@app.route('/api/vehicles', methods=['GET'])
def get_vehicles():
    """Get all vehicles"""
    try:
        conn = get_db()
        cursor = conn.cursor()
        
        cursor.execute('SELECT * FROM vehicles ORDER BY created_at DESC')
        vehicles = rows_to_list(cursor.fetchall())
        conn.close()
        
        return jsonify(vehicles)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/vehicles', methods=['POST'])
def create_vehicle():
    """Create a new vehicle"""
    try:
        data = request.json
        
        conn = get_db()
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO vehicles (
                registration, make, model, color, year, vin,
                owner_name, owner_address, owner_phone, 
                status, assigned_to, notes, photo, created_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            data.get('registration'),
            data.get('make'),
            data.get('model'),
            data.get('color'),
            data.get('year'),
            data.get('vin'),
            data.get('owner_name'),
            data.get('owner_address'),
            data.get('owner_phone'),
            data.get('status', 'active'),
            data.get('assigned_to'),
            data.get('notes'),
            data.get('photo'),
            data.get('created_by')
        ))
        
        vehicle_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        return jsonify({'success': True, 'id': vehicle_id})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/vehicles/<int:vehicle_id>', methods=['PUT'])
def update_vehicle(vehicle_id):
    """Update a vehicle"""
    try:
        data = request.json
        
        conn = get_db()
        cursor = conn.cursor()
        
        cursor.execute('''
            UPDATE vehicles 
            SET registration = ?, make = ?, model = ?, 
                color = ?, year = ?, vin = ?,
                owner_name = ?, owner_address = ?, owner_phone = ?,
                status = ?, assigned_to = ?, notes = ?, photo = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        ''', (
            data.get('registration'),
            data.get('make'),
            data.get('model'),
            data.get('color'),
            data.get('year'),
            data.get('vin'),
            data.get('owner_name'),
            data.get('owner_address'),
            data.get('owner_phone'),
            data.get('status'),
            data.get('assigned_to'),
            data.get('notes'),
            data.get('photo'),
            vehicle_id
        ))
        
        conn.commit()
        conn.close()
        
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/vehicles/<int:vehicle_id>', methods=['DELETE'])
def delete_vehicle(vehicle_id):
    """Delete a vehicle"""
    try:
        conn = get_db()
        cursor = conn.cursor()
        
        cursor.execute('DELETE FROM vehicles WHERE id = ?', (vehicle_id,))
        
        conn.commit()
        conn.close()
        
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/ptt/broadcast', methods=['POST'])
def ptt_broadcast():
    """Handle PTT voice message broadcast"""
    try:
        audio_file = request.files.get('audio')
        channel = request.form.get('channel', 'all')
        user_phone = request.form.get('user_phone')
        user_name = request.form.get('user_name')
        
        if not audio_file:
            return jsonify({'error': 'No audio file provided'}), 400
        
        # Read audio data
        audio_data = audio_file.read()
        content_type = audio_file.content_type or 'audio/webm'
        
        # Store in database
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO ptt_messages (user_phone, user_name, channel, audio_data, content_type)
            VALUES (?, ?, ?, ?, ?)
        ''', (user_phone, user_name, channel, audio_data, content_type))
        
        message_id = cursor.lastrowid
        
        # Clean up old messages (keep last 50)
        cursor.execute('''
            DELETE FROM ptt_messages 
            WHERE id NOT IN (
                SELECT id FROM ptt_messages 
                ORDER BY created_at DESC 
                LIMIT 50
            )
        ''')
        
        conn.commit()
        conn.close()
        
        print(f"\n{'='*50}")
        print(f"PTT BROADCAST - User: {user_name}")
        print(f"PTT BROADCAST - Channel: {channel}")
        print(f"PTT BROADCAST - Audio size: {len(audio_data)} bytes")
        print(f"PTT BROADCAST - Message ID: {message_id}")
        print(f"{'='*50}\n")
        
        return jsonify({
            'success': True,
            'message': 'Voice message broadcast to channel',
            'channel': channel,
            'message_id': message_id
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/users/online', methods=['GET'])
def get_online_users():
    """Get list of online users for PTT"""
    try:
        channel = request.args.get('channel', 'all')
        
        conn = get_db()
        cursor = conn.cursor()
        
        # Get users based on channel filter
        if channel == 'dispatchers':
            cursor.execute("SELECT name, phone, callsign, role FROM users WHERE role = 'Dispatcher'")
        elif channel == 'coordinators':
            cursor.execute("SELECT name, phone, callsign, role FROM users WHERE role = 'Coordinator'")
        elif channel == 'on-duty':
            cursor.execute("SELECT name, phone, callsign, role FROM users WHERE on_duty = 1")
        elif channel == 'on-patrol':
            cursor.execute("SELECT name, phone, callsign, role FROM users WHERE on_patrol = 1")
        else:
            # Get all users
            cursor.execute("SELECT name, phone, callsign, role FROM users")
        
        users = cursor.fetchall()
        conn.close()
        
        result = []
        for user in users:
            user_data = {
                'name': user[0] if user[0] else 'Unknown',
                'phone': user[1] if user[1] else '',
                'callsign': user[2] if user[2] else user[1][-4:] if user[1] else 'N/A',
                'status': user[3] if user[3] else 'Member'
            }
            result.append(user_data)
            print(f"   User: {user_data['name']} ({user_data['callsign']}) - {user_data['status']}")
        
        print(f"\n📻 PTT Users query - Channel: {channel}, Found: {len(result)} users")
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/ptt/messages', methods=['GET'])
def get_ptt_messages():
    """Get new PTT messages for the user"""
    try:
        user_phone = request.args.get('user_phone')
        channel = request.args.get('channel', 'all')
        since_id = int(request.args.get('since_id', 0))
        
        conn = get_db()
        cursor = conn.cursor()
        
        # Query messages newer than since_id, excluding user's own messages
        cursor.execute('''
            SELECT id, user_name, channel, created_at
            FROM ptt_messages
            WHERE id > ? AND user_phone != ? AND (channel = ? OR channel = 'all')
            ORDER BY id
        ''', (since_id, user_phone, channel))
        
        new_messages = []
        for row in cursor.fetchall():
            new_messages.append({
                'id': row[0],
                'user_name': row[1],
                'channel': row[2],
                'timestamp': row[3]
            })
        
        conn.close()
        
        if new_messages:
            print(f"\n{'='*50}")
            print(f"PTT POLLING - Found {len(new_messages)} new messages")
            print(f"PTT POLLING - Channel: {channel}")
            print(f"PTT POLLING - Since ID: {since_id}")
            print(f"{'='*50}\n")
        
        return jsonify({
            'messages': new_messages,
            'count': len(new_messages)
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/ptt/audio/<int:message_id>', methods=['GET'])
def get_ptt_audio(message_id):
    """Get audio data for a specific PTT message"""
    try:
        conn = get_db()
        cursor = conn.cursor()
        
        # Query the message
        cursor.execute('''
            SELECT audio_data, content_type
            FROM ptt_messages
            WHERE id = ?
        ''', (message_id,))
        
        row = cursor.fetchone()
        conn.close()
        
        if not row:
            return jsonify({'error': 'Message not found'}), 404
        
        audio_data = row[0]
        content_type = row[1]
        
        # Return audio data
        from flask import Response
        return Response(
            audio_data,
            mimetype=content_type,
            headers={
                'Content-Disposition': f'inline; filename=ptt_{message_id}.webm',
                'Cache-Control': 'no-cache'
            }
        )
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    print("\n" + "="*60)
    print("Shomrim OTP Server Starting...")
    print("="*60)
    print("\nIMPORTANT: To enable SMS sending:")
    print("1. Sign up at https://www.twilio.com/try-twilio")
    print("2. Get your Account SID, Auth Token, and Phone Number")
    print("3. Set environment variables:")
    print("   - TWILIO_ACCOUNT_SID")
    print("   - TWILIO_AUTH_TOKEN")
    print("   - TWILIO_PHONE_NUMBER")
    print("\nFor testing, OTPs will be printed to console")
    print("="*60 + "\n")
    
    # Get port from environment variable (for cloud deployment) or use 5000
    port = int(os.environ.get('PORT', 5000))
    
    # Run on all network interfaces so mobile devices can access
    app.run(debug=os.environ.get('DEBUG', 'False') == 'True', host='0.0.0.0', port=port)
