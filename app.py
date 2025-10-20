from threading import Timer
import webbrowser
from flask import Flask, render_template, request, redirect, url_for, flash, session, send_from_directory, jsonify
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import uuid
from datetime import datetime, timedelta
# --- ADDED: Imports for new class features ---
import random
import string

app = Flask(__name__)
app.secret_key = "supersecretkey"

# Database configuration
basedir = os.path.abspath(os.path.dirname(__file__))
db_path = os.path.join(basedir, 'app.db')
app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{db_path}'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

# --- ADDED: Association Table for Student/Class Enrollment ---
# This table links Students and Classes in a many-to-many relationship.
enrollments = db.Table('enrollments',
    db.Column('student_id', db.Integer, db.ForeignKey('student.id'), primary_key=True),
    db.Column('class_id', db.Integer, db.ForeignKey('class.id'), primary_key=True)
)

# Student model
class Student(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(150), unique=True, nullable=False)
    password = db.Column(db.String(200), nullable=False)
    first_name = db.Column(db.String(100))
    last_name = db.Column(db.String(100))
    student_id = db.Column(db.String(50), unique=True)
    course = db.Column(db.String(100))
    year_level = db.Column(db.String(50))
    user_type = db.Column(db.String(20), default='student')
    
    # --- ADDED: Relationship to classes ---
    classes = db.relationship('Class', secondary=enrollments, lazy='subquery',
                              backref=db.backref('students', lazy=True))

    def __repr__(self):
        return f'<Student {self.username}>'

# Professor model
class Professor(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(150), unique=True, nullable=False)
    password = db.Column(db.String(200), nullable=False)
    first_name = db.Column(db.String(100))
    last_name = db.Column(db.String(100))
    professor_id = db.Column(db.String(50), unique=True)
    department = db.Column(db.String(100))
    user_type = db.Column(db.String(20), default='professor')

    # --- ADDED: Relationship to classes ---
    classes = db.relationship('Class', backref='professor', lazy=True)

    def __repr__(self):
        return f'<Professor {self.username}>'
        
# --- ADDED: Class Model ---
# This model represents a class created by a professor.
class Class(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(150), nullable=False)
    description = db.Column(db.String(300))
    code = db.Column(db.String(10), unique=True, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    professor_id = db.Column(db.Integer, db.ForeignKey('professor.id'), nullable=False)

    def __repr__(self):
        return f'<Class {self.name} ({self.code})>'

# Password Reset Token model
class PasswordResetToken(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(150), nullable=False)
    token = db.Column(db.String(100), unique=True, nullable=False)
    user_type = db.Column(db.String(20), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    expires_at = db.Column(db.DateTime, nullable=False)
    used = db.Column(db.Boolean, default=False)

    def __repr__(self):
        return f'<PasswordResetToken {self.token}>'

# Initialize database
with app.app_context():
    try:
        # Only create tables if they don't exist - remove db.drop_all() to keep existing data
        db.create_all()
        print("✓ Database tables checked/created successfully!")
        print(f"Database location: {db_path}")
        
        # Verify tables were created
        from sqlalchemy import inspect
        inspector = inspect(db.engine)
        tables = inspector.get_table_names()
        print("✓ Tables in database:", tables)
        
    except Exception as e:
        print(f"❌ Error with database: {e}")

def generate_reset_token():
    """Generate a unique reset token"""
    return str(uuid.uuid4())

# Static file routes
@app.route('/css/<path:filename>')
def serve_css(filename):
    return send_from_directory(os.path.join(basedir, 'css'), filename)

@app.route('/js/<path:filename>')
def serve_js(filename):
    return send_from_directory(os.path.join(basedir, 'js'), filename)

@app.route('/images/<path:filename>')
def serve_images(filename):
    return send_from_directory(os.path.join(basedir, 'images'), filename)

# Serve specific files directly
@app.route('/professor-styles.css')
def serve_professor_css():
    return send_from_directory(basedir, 'professor-styles.css')

@app.route('/professor-script.js')
def serve_professor_js():
    return send_from_directory(basedir, 'professor-script.js')

@app.route('/student-styles.css')
def serve_student_css():
    return send_from_directory(basedir, 'student-styles.css')

@app.route('/student-script.js')
def serve_student_js():
    return send_from_directory(basedir, 'student-script.js')

@app.route('/login.css')
def serve_login_css():
    return send_from_directory(basedir, 'login.css')

@app.route('/signup.css')
def serve_signup_css():
    return send_from_directory(basedir, 'signup.css')

@app.route('/styles.css')
def serve_styles_css():
    return send_from_directory(basedir, 'styles.css')

@app.route('/script.js')
def serve_script_js():
    return send_from_directory(basedir, 'script.js')

# Error handlers for JSON responses
@app.errorhandler(404)
def not_found_error(error):
    if request.path.startswith('/api/'):
        return jsonify({'error': 'Endpoint not found'}), 404
    return render_template('404.html'), 404

@app.errorhandler(500)
def internal_error(error):
    if request.path.startswith('/api/'):
        return jsonify({'error': 'Internal server error'}), 500
    return render_template('500.html'), 500

@app.errorhandler(401)
def unauthorized_error(error):
    if request.path.startswith('/api/'):
        return jsonify({'error': 'Unauthorized'}), 401
    flash("Please log in to access this page")
    return redirect(url_for('login'))

# Debug routes
@app.route('/debug/api-check')
def debug_api_check():
    """Debug route to check API endpoints"""
    endpoints = {
        'professor_classes': '/api/professor/classes',
        'student_stats': '/api/student/stats', 
        'professor_stats': '/api/professor/stats',
        'profile': '/api/profile'
    }
    
    results = {}
    with app.test_client() as client:
        for name, endpoint in endpoints.items():
            try:
                # Set session for testing
                with client.session_transaction() as sess:
                    if 'user_id' in session:
                        sess['user_id'] = session['user_id']
                        sess['user_type'] = session['user_type']
                
                response = client.get(endpoint)
                results[name] = {
                    'status_code': response.status_code,
                    'content_type': response.content_type,
                    'is_json': response.is_json,
                    'data_preview': response.get_data(as_text=True)[:100]
                }
            except Exception as e:
                results[name] = {'error': str(e)}
    
    return jsonify(results)

@app.route('/debug/session')
def debug_session():
    return jsonify(dict(session))

# Routes
@app.route('/')
def index():
    print("Session data:", dict(session))
    if 'user_id' in session:
        return redirect(url_for('dashboard'))
    return render_template('index.html')


@app.route('/api/profile')
def get_profile():
    if 'user_id' not in session:
        return {'error': 'Unauthorized'}, 401
    
    user_type = session.get('user_type')
    user_id = session.get('user_id')
    
    if user_type == 'student':
        user = Student.query.get(user_id)
        return {
            'first_name': user.first_name,
            'last_name': user.last_name,
            'email': user.username,
            'student_id': user.student_id,
            'course': user.course,
            'year_level': user.year_level,
            'user_type': 'student'
        }
    else:
        user = Professor.query.get(user_id)
        return {
            'first_name': user.first_name,
            'last_name': user.last_name,
            'email': user.username,
            'professor_id': user.professor_id,
            'department': user.department,
            'user_type': 'professor'
        }

@app.route('/forgot-password', methods=['GET', 'POST'])
def forgot_password():
    if request.method == 'POST':
        email = request.form.get('email')
        user_type = request.form.get('userType')
        
        print(f"Password reset request - Email: {email}, User Type: {user_type}")
        
        if not email or not user_type:
            flash("Please provide email and select user type")
            return redirect(url_for('forgot_password'))
        
        # Check if user exists
        if user_type == 'student':
            user = Student.query.filter_by(username=email).first()
        else:
            user = Professor.query.filter_by(username=email).first()
        
        print(f"User found: {user}")
        
        if user:
            # Generate reset token
            token = generate_reset_token()
            expires_at = datetime.utcnow() + timedelta(hours=1)
            
            # Save token to database
            reset_token = PasswordResetToken(
                email=email,
                token=token,
                user_type=user_type,
                expires_at=expires_at
            )
            
            try:
                db.session.add(reset_token)
                db.session.commit()
                print(f"✓ Reset token created for {email}: {token}")
                
                # For development: Redirect directly to verification page
                flash("Reset link generated! You can now verify your identity.")
                return redirect(url_for('verify_identity', token=token))
                
            except Exception as e:
                print(f"❌ Error generating reset token: {e}")
                db.session.rollback()
                flash("Error generating reset token. Please try again.")
        else:
            flash("No account found with that email address.")
        
        return redirect(url_for('forgot_password'))
    
    return render_template('forgot_password.html')

@app.route('/verify-identity/<token>', methods=['GET', 'POST'])
def verify_identity(token):
    # Verify token
    reset_token = PasswordResetToken.query.filter_by(token=token, used=False).first()
    
    if not reset_token:
        flash("Invalid or expired reset link.")
        return redirect(url_for('login'))
    
    if datetime.utcnow() > reset_token.expires_at:
        flash("Reset link has expired.")
        return redirect(url_for('forgot_password'))
    
    # Get user information for verification
    if reset_token.user_type == 'student':
        user = Student.query.filter_by(username=reset_token.email).first()
        user_type_name = "Student"
    else:
        user = Professor.query.filter_by(username=reset_token.email).first()
        user_type_name = "Professor"
    
    if not user:
        flash("User not found.")
        return redirect(url_for('forgot_password'))
    
    if request.method == 'POST':
        # Verify the provided information
        first_name = request.form.get('first_name')
        last_name = request.form.get('last_name')
        
        print(f"Verification attempt - First: {first_name}, Last: {last_name}")
        print(f"User data - First: {user.first_name}, Last: {user.last_name}")
        
        if reset_token.user_type == 'student':
            student_id = request.form.get('student_id')
            # Verify student information
            if (user.first_name.lower() == first_name.lower() and 
                user.last_name.lower() == last_name.lower() and 
                user.student_id == student_id):
                # Identity verified - redirect to password reset
                flash("Identity verified! You can now reset your password.")
                return redirect(url_for('reset_password', token=token))
            else:
                flash("The information you provided does not match our records. Please try again.")
        else:
            professor_id = request.form.get('professor_id')
            # Verify professor information
            if (user.first_name.lower() == first_name.lower() and 
                user.last_name.lower() == last_name.lower() and 
                user.professor_id == professor_id):
                # Identity verified - redirect to password reset
                flash("Identity verified! You can now reset your password.")
                return redirect(url_for('reset_password', token=token))
            else:
                flash("The information you provided does not match our records. Please try again.")
    
    return render_template('verify_identity.html', 
                         token=token, 
                         user_type=reset_token.user_type,
                         user_type_name=user_type_name,
                         email=reset_token.email)

@app.route('/reset-password/<token>', methods=['GET', 'POST'])
def reset_password(token):
    # Verify token
    reset_token = PasswordResetToken.query.filter_by(token=token, used=False).first()
    
    if not reset_token:
        flash("Invalid or expired reset link.")
        return redirect(url_for('login'))
    
    if datetime.utcnow() > reset_token.expires_at:
        flash("Reset link has expired.")
        return redirect(url_for('forgot_password'))
    
    if request.method == 'POST':
        password = request.form.get('password')
        confirm_password = request.form.get('confirm_password')
        
        if password != confirm_password:
            flash("Passwords do not match!")
            return render_template('reset_password.html', token=token)
        
        if len(password) < 6:
            flash("Password must be at least 6 characters long!")
            return render_template('reset_password.html', token=token)
        
        # Update user password
        if reset_token.user_type == 'student':
            user = Student.query.filter_by(username=reset_token.email).first()
        else:
            user = Professor.query.filter_by(username=reset_token.email).first()
        
        if user:
            try:
                user.password = generate_password_hash(password)
                reset_token.used = True
                db.session.commit()
                print(f"✓ Password reset successfully for: {reset_token.email}")
                flash("Password reset successfully! You can now login with your new password.")
                return redirect(url_for('login'))
            except Exception as e:
                print(f"❌ Error resetting password: {e}")
                db.session.rollback()
                flash("Error resetting password. Please try again.")
        else:
            flash("User not found.")
    
    return render_template('reset_password.html', token=token)

@app.route('/debug/database')
def debug_database():
    """Debug route to check database structure and data"""
    from sqlalchemy import inspect
    
    inspector = inspect(db.engine)
    tables = inspector.get_table_names()
    
    result = {
        'tables': tables,
        'table_details': {},
        'data': {}
    }
    
    for table_name in tables:
        # Get table structure
        columns = inspector.get_columns(table_name)
        result['table_details'][table_name] = [
            {'name': col['name'], 'type': str(col['type'])} 
            for col in columns
        ]
        
        # Get table data
        if table_name == 'student':
            students = Student.query.all()
            result['data'][table_name] = [
                {'id': s.id, 'username': s.username, 'first_name': s.first_name, 
                 'last_name': s.last_name, 'student_id': s.student_id} 
                for s in students
            ]
        elif table_name == 'professor':
            professors = Professor.query.all()
            result['data'][table_name] = [
                {'id': p.id, 'username': p.username, 'first_name': p.first_name,
                 'last_name': p.last_name, 'professor_id': p.professor_id}
                for p in professors
            ]
        elif table_name == 'password_reset_token':
            tokens = PasswordResetToken.query.all()
            result['data'][table_name] = [
                {'id': t.id, 'email': t.email, 'token': t.token, 
                 'user_type': t.user_type, 'used': t.used}
                for t in tokens
            ]
    
    return result

@app.route('/debug/clear-tokens')
def clear_tokens():
    """Debug route to clear all reset tokens"""
    try:
        PasswordResetToken.query.delete()
        db.session.commit()
        return "All reset tokens cleared successfully!"
    except Exception as e:
        return f"Error clearing tokens: {e}"

@app.route('/signup', methods=['GET', 'POST'])
def signup():
    if request.method == 'POST':
        print("=== SIGNUP FORM DATA ===")
        print("Form data:", dict(request.form))
        
        user_type = request.form.get('userType')
        first_name = request.form.get('firstName')
        last_name = request.form.get('lastName')
        email = request.form.get('email')
        password = request.form.get('password')
        confirm_password = request.form.get('confirmPassword')
        policy_agreed = request.form.get('policy')

        # Common validation
        if not all([first_name, last_name, email, password, confirm_password, user_type]):
            flash("All fields are required!")
            return redirect(url_for('signup'))
            
        if not policy_agreed:
            flash("You must agree to the policy!")
            return redirect(url_for('signup'))

        if password != confirm_password:
            flash("Passwords do not match!")
            return redirect(url_for('signup'))

        # Check if email already exists in either table
        existing_student = Student.query.filter_by(username=email).first()
        existing_professor = Professor.query.filter_by(username=email).first()
        
        if existing_student or existing_professor:
            flash("Email already registered!")
            return redirect(url_for('signup'))

        try:
            hashed_password = generate_password_hash(password)
            
            if user_type == 'student':
                student_id = request.form.get('studentId')
                course = request.form.get('course')
                year_level = request.form.get('yearLevel')
                
                print(f"Student data - ID: {student_id}, Course: {course}, Year: {year_level}")
                
                if not all([student_id, course, year_level]):
                    flash("All student fields are required!")
                    return redirect(url_for('signup'))
                
                # Check if student ID already exists
                existing_student_id = Student.query.filter_by(student_id=student_id).first()
                if existing_student_id:
                    flash("Student ID already registered!")
                    return redirect(url_for('signup'))
                
                new_user = Student(
                    username=email,
                    password=hashed_password,
                    first_name=first_name,
                    last_name=last_name,
                    student_id=student_id,
                    course=course,
                    year_level=year_level
                )
                
            else:  # professor
                professor_id = request.form.get('professorId')
                department = request.form.get('department')
                
                print(f"Professor data - ID: {professor_id}, Department: {department}")
                
                if not all([professor_id, department]):
                    flash("All professor fields are required!")
                    return redirect(url_for('signup'))
                
                # Check if professor ID already exists
                existing_professor_id = Professor.query.filter_by(professor_id=professor_id).first()
                if existing_professor_id:
                    flash("Professor ID already registered!")
                    return redirect(url_for('signup'))
                
                new_user = Professor(
                    username=email,
                    password=hashed_password,
                    first_name=first_name,
                    last_name=last_name,
                    professor_id=professor_id,
                    department=department
                )
            
            db.session.add(new_user)
            db.session.commit()
            print(f"✓ {user_type.capitalize()} created successfully: {email}")
            print(f"User ID: {new_user.id}")
            
            # Verify the user was saved
            if user_type == 'student':
                saved_user = Student.query.filter_by(username=email).first()
            else:
                saved_user = Professor.query.filter_by(username=email).first()
                
            if saved_user:
                print(f"✓ User verified in database: {saved_user}")
            else:
                print("❌ User not found in database after creation!")
            
            flash("Account created successfully! Please log in.")
            return redirect(url_for('login'))
            
        except Exception as e:
            print(f"❌ Error creating user: {e}")
            db.session.rollback()
            flash("Error creating account. Please try again.")
            return redirect(url_for('signup'))

    return render_template('signup.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    if 'user_id' in session:
        return redirect(url_for('dashboard'))
        
    if request.method == 'POST':
        print("Login attempt:", request.form)
        
        email = request.form.get('email')
        password = request.form.get('password')
        user_type = request.form.get('userType')

        if not email or not password or not user_type:
            flash("All fields are required")
            return redirect(url_for('login'))

        # Check in the appropriate table based on user type
        if user_type == 'student':
            user = Student.query.filter_by(username=email).first()
        else:  # professor
            user = Professor.query.filter_by(username=email).first()

        print(f"User found: {user}")
        
        if user and check_password_hash(user.password, password):
            session['user_id'] = user.id
            session['user_email'] = user.username
            session['user_first_name'] = user.first_name
            session['user_type'] = user_type
            print(f"Login successful for: {email} ({user_type})")
            flash("Logged in successfully!")
            return redirect(url_for('dashboard'))
        else:
            print("Login failed")
            flash("Invalid email or password")
            return redirect(url_for('login'))

    return render_template('login.html')

@app.route('/dashboard')
def dashboard():
    print("Dashboard session:", dict(session))
    
    if 'user_id' not in session:
        flash("Please log in to access the dashboard")
        return redirect(url_for('login'))
    
    user_type = session.get('user_type')
    user_id = session.get('user_id')
    
    if user_type == 'student':
        user = Student.query.get(user_id)
        if not user:
            flash("Student not found")
            return redirect(url_for('logout'))
        print(f"Rendering student dashboard for: {user.first_name}")
        return render_template('student_dashboard.html', 
                             user=user)
    else:  # professor
        user = Professor.query.get(user_id)
        if not user:
            flash("Professor not found")
            return redirect(url_for('logout'))
        print(f"Rendering professor dashboard for: {user.first_name}")
        return render_template('professor_dashboard.html', 
                             user=user)

@app.route('/logout', methods=['GET', 'POST'])
def logout():
    session.clear()
    flash("You have been logged out successfully!", "success")
    return redirect(url_for('login'))

# --- FIXED: API Route for Class Management (Handles both Professors and Students) ---
def generate_class_code():
    """Generates a random 6-character alphanumeric class code."""
    while True:
        code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
        if not Class.query.filter_by(code=code).first():
            return code

@app.route('/api/professor/classes', methods=['GET', 'POST', 'DELETE'])
def manage_classes():
    # Check if user is logged in and is a professor
    if 'user_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 401

    user_id = session['user_id']
    user_type = session.get('user_type')

    # Ensure the request wants JSON
    if request.method in ['POST', 'DELETE'] and not request.is_json:
        return jsonify({'error': 'Content-Type must be application/json'}), 400

    # Professor logic
    if user_type == 'professor':
        professor = Professor.query.get(user_id)
        if not professor:
            return jsonify({'error': 'Professor not found'}), 404

        if request.method == 'GET':
            try:
                classes_data = []
                # FIX 1 (Already applied): Ensure professors only see classes they own by explicitly filtering by their ID.
                classes = Class.query.filter_by(professor_id=user_id).all()
                for cls in classes:
                    students_list = [{
                        'id': student.student_id,
                        'name': f"{student.first_name} {student.last_name}",
                        'email': student.username
                    } for student in cls.students]
                    
                    classes_data.append({
                        'id': str(cls.id),
                        'name': cls.name,
                        'description': cls.description,
                        'code': cls.code,
                        'students': students_list,
                        'materials': [], 
                        'assignments': [] 
                    })
                return jsonify(classes_data)
            except Exception as e:
                print(f"Error fetching professor classes: {e}")
                return jsonify({'error': 'Failed to fetch classes'}), 500

        elif request.method == 'POST':
            try:
                data = request.get_json()
                if not data:
                    return jsonify({'error': 'No JSON data provided'}), 400
                    
                class_name = data.get('name')
                class_desc = data.get('description')
                class_code = generate_class_code()
                
                if not class_name:
                    return jsonify({'error': 'Class name is required'}), 400
                    
                new_class = Class(
                    name=class_name,
                    description=class_desc,
                    code=class_code,
                    professor_id=user_id
                )
                db.session.add(new_class)
                db.session.commit()
                
                return jsonify({
                    'id': str(new_class.id),
                    'name': new_class.name,
                    'description': new_class.description,
                    'code': new_class.code,
                    'students': [],
                    'materials': [],
                    'assignments': []
                }), 201
            except Exception as e:
                db.session.rollback()
                print(f"Error creating class: {e}")
                return jsonify({'error': 'Failed to create class'}), 500

        elif request.method == 'DELETE':
            try:
                data = request.get_json()
                if not data:
                    return jsonify({'error': 'No JSON data provided'}), 400
                    
                class_id = data.get('class_id')
                
                if not class_id:
                    return jsonify({'error': 'Class ID is required'}), 400
                
                # FIX 2: Convert class_id to integer for database query
                class_id_int = int(class_id)
                
                cls = Class.query.filter_by(id=class_id_int, professor_id=user_id).first()
                if not cls:
                    return jsonify({'error': 'Class not found or you do not have permission to delete it'}), 404
                
                # Remove all student enrollments first (good practice)
                cls.students = []
                db.session.commit()
                
                # Then delete the class
                db.session.delete(cls)
                db.session.commit()
                
                return jsonify({'message': 'Class deleted successfully'}), 200
            except ValueError:
                return jsonify({'error': 'Invalid class ID format'}), 400
            except Exception as e:
                db.session.rollback()
                print(f"Error deleting class: {e}")
                return jsonify({'error': 'Failed to delete class'}), 500
    
    # Student logic
    elif user_type == 'student':
        if request.method == 'POST':
            return jsonify({'error': 'Students are not allowed to create classes'}), 403
        
        if request.method == 'DELETE':
            return jsonify({'error': 'Students are not allowed to delete classes'}), 403
            
        student = Student.query.get(user_id)
        if not student:
            return jsonify({'error': 'Student not found'}), 404
        
        try:
            classes_data = []
            # FIX 3 (Enrollment Bug Check): Student's enrolled classes are correctly filtered via the many-to-many relationship.
            # This is the correct logic for students to ONLY see enrolled classes.
            for cls in student.classes:
                professor = Professor.query.get(cls.professor_id)
                classes_data.append({
                    'id': str(cls.id),
                    'name': cls.name,
                    'description': cls.description,
                    'code': cls.code,
                    'professor_name': f"{professor.first_name} {professor.last_name}" if professor else "N/A"
                })
            return jsonify(classes_data)
        except Exception as e:
            print(f"Error fetching student classes: {e}")
            return jsonify({'error': 'Failed to fetch classes'}), 500
        
    else:
        return jsonify({'error': 'Invalid user type'}), 400

# --- ADDED: API Route for students to join a class ---
@app.route('/api/student/join_class', methods=['POST'])
def join_class():
    """API endpoint for students to join a class with a code."""
    if 'user_id' not in session or session.get('user_type') != 'student':
        return jsonify({'error': 'Unauthorized'}), 401
    
    student_id = session['user_id']
    student = Student.query.get(student_id)
    if not student:
        return jsonify({'error': 'Student not found'}), 404

    data = request.get_json()
    if not data:
        return jsonify({'error': 'No JSON data provided'}), 400
        
    class_code = data.get('code')
    if not class_code:
        return jsonify({'error': 'Class code is required'}), 400

    cls_to_join = Class.query.filter_by(code=class_code).first()
    if not cls_to_join:
        return jsonify({'error': 'Class not found with that code'}), 404
    
    if student in cls_to_join.students:
        return jsonify({'error': 'You are already enrolled in this class'}), 400

    try:
        cls_to_join.students.append(student)
        db.session.commit()
        
        professor = Professor.query.get(cls_to_join.professor_id)
        
        return jsonify({
            'message': 'Successfully joined class!',
            'class': {
                'id': str(cls_to_join.id),
                'name': cls_to_join.name,
                'description': cls_to_join.description,
                'code': cls_to_join.code,
                'professor_name': f"{professor.first_name} {professor.last_name}" if professor else "N/A"
            }
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Could not join class, please try again.'}), 500

# --- FIXED: API Route for students to unenroll from a class ---
@app.route('/api/student/unenroll_class', methods=['POST'])
def unenroll_class():
    """API endpoint for students to unenroll from a class."""
    if 'user_id' not in session or session.get('user_type') != 'student':
        return jsonify({'error': 'Unauthorized'}), 401
    
    student_id = session['user_id']
    student = Student.query.get(student_id)
    if not student:
        return jsonify({'error': 'Student not found'}), 404

    data = request.get_json()
    if not data:
        return jsonify({'error': 'No JSON data provided'}), 400
        
    class_id = data.get('class_id')
    if not class_id:
        return jsonify({'error': 'Class ID is required'}), 400

    try:
        # Convert class_id to integer for database query
        class_id_int = int(class_id)
        cls_to_leave = Class.query.get(class_id_int)
    except ValueError:
        return jsonify({'error': 'Invalid class ID format'}), 400
    
    if not cls_to_leave:
        return jsonify({'error': 'Class not found'}), 404
    
    if student not in cls_to_leave.students:
        return jsonify({'error': 'You are not enrolled in this class'}), 400

    try:
        cls_to_leave.students.remove(student)
        db.session.commit()
        
        return jsonify({
            'message': 'Successfully unenrolled from class!',
            'class_id': class_id
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Could not unenroll from class, please try again.'}), 500
        
# --- ADDED: Debug route to manually enroll a student ---
@app.route('/debug/enroll/<student_id_str>/<class_code_str>')
def debug_enroll(student_id_str, class_code_str):
    student = Student.query.filter_by(student_id=student_id_str).first()
    cls = Class.query.filter_by(code=class_code_str).first()
    
    if not student:
        return f"Student with ID {student_id_str} not found.", 404
    if not cls:
        return f"Class with code {class_code_str} not found.", 404
        
    try:
        # Avoid duplicate enrollment
        if student in cls.students:
            return f"Student {student.first_name} is already enrolled in {cls.name}."
        
        cls.students.append(student)
        db.session.commit()
        return f"Successfully enrolled student {student.first_name} in class {cls.name}."
    except Exception as e:
        db.session.rollback()
        return f"Error enrolling student: {e}", 500

# --- FIXED: Routes for dashboard statistics to use real data ---
@app.route('/api/student/stats')
def student_stats():
    """API endpoint for student dashboard statistics"""
    if 'user_id' not in session or session.get('user_type') != 'student':
        return {'error': 'Unauthorized'}, 401
    
    student_id = session.get('user_id')
    student = Student.query.get(student_id)
    
    if not student:
        return {'error': 'Student not found'}, 404
    
    # Return actual data where available
    return {
        'enrolled_classes': len(student.classes),
        'pending_assignments': 0, # Mocked for now
        'upcoming_deadlines': 0, # Mocked for now
        'completed_assignments': 0 # Mocked for now
    }

@app.route('/api/professor/stats')
def professor_stats():
    """API endpoint for professor dashboard statistics"""
    if 'user_id' not in session or session.get('user_type') != 'professor':
        return {'error': 'Unauthorized'}, 401
    
    professor_id = session.get('user_id')
    professor = Professor.query.get(professor_id)
    
    if not professor:
        return {'error': 'Professor not found'}, 404
    
    # Calculate total students across all classes for this professor
    total_students = sum(len(c.students) for c in professor.classes)
    
    # Return actual data where available
    return {
        'total_classes': len(professor.classes),
        'total_students': total_students,
        'pending_tasks': 0, # Mocked for now
        'upcoming_deadlines': 0 # Mocked for now
    }

@app.route('/api/profile/update-password', methods=['POST'])
def update_password():
    """API endpoint to update user password"""
    if 'user_id' not in session:
        return {'error': 'Unauthorized'}, 401
    
    user_type = session.get('user_type')
    user_id = session.get('user_id')
    current_password = request.json.get('current_password')
    new_password = request.json.get('new_password')
    
    if user_type == 'student':
        user = Student.query.get(user_id)
    else:
        user = Professor.query.get(user_id)
    
    if not user:
        return {'error': 'User not found'}, 404
    
    if not check_password_hash(user.password, current_password):
        return {'error': 'Current password is incorrect'}, 400
    
    try:
        user.password = generate_password_hash(new_password)
        db.session.commit()
        return {'message': 'Password updated successfully'}
    except Exception as e:
        db.session.rollback()
        return {'error': 'Failed to update password'}, 500

# Serve static files for templates
@app.route('/static/<path:filename>')
def serve_static(filename):
    return send_from_directory(os.path.join(basedir, 'static'), filename)

def open_browser():
    webbrowser.open_new("http://127.0.0.1:5000/")

if __name__ == '__main__':
    print(f"Database path: {db_path}")
    print("Starting Flask application...")
    
    # Check if database file exists
    if os.path.exists(db_path):
        print("✓ Database file exists")
    else:
        print("⚠ Database file will be created")
    
    # Only open browser if not in debug mode or first run
    import sys
    if not os.environ.get("WERKZEUG_RUN_MAIN"):
        Timer(1, open_browser).start()
    
    app.run(debug=True, use_reloader=False)
