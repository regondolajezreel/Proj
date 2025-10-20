// Professor Dashboard JavaScript

// Global variables
let currentClassId = null;
let classes = [];
let assignments = [];
let submissions = [];
let calendarEvents = {};

// DOM Elements
const sidebar = document.getElementById('sidebar');
const contentSections = document.querySelectorAll('.content-section');
const navLinks = document.querySelectorAll('.sidebar nav a');
const profileDropdown = document.getElementById('profile-dropdown');
const dropdownMenu = document.getElementById('dropdown-menu');
// Added for Assignment/Material saving functions
const assignmentModal = document.getElementById('assignment-modal');
const gradingModal = document.getElementById('grading-modal');

// Sidebar toggle
function toggleSidebar() {
  sidebar.classList.toggle('collapsed');
}

// Show section function
function showSection(sectionId, element = null) {
  // Hide all sections
  contentSections.forEach(section => {
    section.classList.remove('active');
  });

  // Remove active class from all nav links
  if (element) {
    navLinks.forEach(link => {
      link.classList.remove('active');
    });
    element.classList.add('active');
  }

  // Show selected section
  document.getElementById(sectionId).classList.add('active');
}

// Profile dropdown toggle
if (profileDropdown) {
  profileDropdown.addEventListener('click', function(e) {
    e.stopPropagation();
    dropdownMenu.classList.toggle('show');
  });
}

// Close dropdown when clicking outside
document.addEventListener('click', function() {
  dropdownMenu.classList.remove('show');
});

document.addEventListener('DOMContentLoaded', function() {
  // Initialize dashboard stats
  updateDashboardStats();
  
  // Load classes from API
  loadClasses();
  
  // Initialize calendar
  initializeCalendar();
  
  // Event listeners for class management
  document.getElementById('create-class-btn').addEventListener('click', showCreateClassModal);
  document.getElementById('cancel-class').addEventListener('click', hideCreateClassModal);
  document.getElementById('save-class').addEventListener('click', createClass);
  
  // Auto-generate class code
  document.getElementById('class-name').addEventListener('input', function() {
    if (!document.getElementById('class-code').value) {
      document.getElementById('class-code').value = generateClassCode();
    }
  });
  
  // Back to classes button
  document.getElementById('back-to-classes').addEventListener('click', function() {
    document.getElementById('class-view').classList.add('hidden');
    // Ensure the main "Enrolled Classes" section is made active and visible
    document.getElementById('class-view').classList.remove('active');
    document.getElementById('enrolled-section').classList.add('active');
    currentClassId = null; // Clear current class context
  });
  
  // Upload form controls
  document.getElementById('show-upload-form').addEventListener('click', function() {
    document.getElementById('upload-form').classList.remove('hidden');
  });
  
  document.getElementById('cancel-upload').addEventListener('click', function() {
    document.getElementById('upload-form').classList.add('hidden');
    resetUploadForm();
  });
  
  document.getElementById('post-upload').addEventListener('click', uploadMaterial);
  
  // File upload display
  document.getElementById('lesson-file').addEventListener('change', function() {
    const fileChosen = document.getElementById('file-chosen');
    if (this.files.length > 0) {
      fileChosen.textContent = `${this.files.length} file(s) selected`;
    } else {
      fileChosen.textContent = 'No files selected';
    }
  });
  
  // Tab switching
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      const tabName = this.getAttribute('data-tab');
      switchTab(tabName);
      
      // Load content when tabs are clicked
      if (currentClassId) {
        if (tabName === 'posts') loadClassPosts();
        if (tabName === 'students') loadClassStudents();
        if (tabName === 'assignments') loadClassAssignments();
        if (tabName === 'grades') loadClassGrades();
      }
    });
  });
  
  // Assignment modal controls
  if (assignmentModal) {
    document.getElementById('close-assignment-modal').addEventListener('click', function() {
      assignmentModal.style.display = 'none';
      resetAssignmentForm(); // Bug fix: Reset form when closing
    });
  }
  
  document.getElementById('save-assignment').addEventListener('click', saveAssignment);
  
  // Assignment files display
  document.getElementById('assignment-files').addEventListener('change', function() {
    const fileChosen = document.getElementById('assignment-files-chosen');
    if (this.files.length > 0) {
      fileChosen.textContent = `${this.files.length} file(s) selected`;
    } else {
      fileChosen.textContent = 'No files selected';
    }
  });
  
  // Grading modal controls
  if (gradingModal) {
    document.getElementById('close-grading-modal').addEventListener('click', function() {
      gradingModal.style.display = 'none';
    });
  }
  
  document.getElementById('save-grade').addEventListener('click', saveGrade);
});

// Load classes from API
async function loadClasses() {
  try {
    const response = await fetch('/api/professor/classes');
    if (response.ok) {
      classes = await response.json();
      renderClassList();
      updateDashboardStats();
    } else {
      console.error('Failed to load classes:', response.status);
    }
  } catch (error) {
    console.error('Error loading classes:', error);
  }
}

// Generate random class code
function generateClassCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Show create class modal
function showCreateClassModal() {
  document.getElementById('class-modal').style.display = 'flex';
  document.getElementById('class-code').value = generateClassCode();
}

// Hide create class modal
function hideCreateClassModal() {
  document.getElementById('class-modal').style.display = 'none';
  resetCreateClassForm();
}

// Reset create class form
function resetCreateClassForm() {
  document.getElementById('class-name').value = '';
  document.getElementById('class-description').value = '';
  document.getElementById('class-code').value = '';
}

// Create new class
async function createClass() {
  const className = document.getElementById('class-name').value.trim();
  const classDescription = document.getElementById('class-description').value.trim();
  const classCode = document.getElementById('class-code').value.trim();
  
  if (!className) {
    alert('Please enter a class name');
    return;
  }
  
  if (!classCode) {
    // Bug fix: Ensure a code is generated if user deletes auto-generated one
    document.getElementById('class-code').value = generateClassCode();
    alert('Please generate a class code or enter one');
    return;
  }
  
  try {
    const response = await fetch('/api/professor/classes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: className,
        description: classDescription,
        code: classCode
      })
    });

    const result = await response.json();

    if (response.ok) {
      // Add the new class to the local array
      classes.push(result);
      renderClassList();
      hideCreateClassModal();
      alert(`Class "${className}" created successfully! Class Code: ${classCode}`);
      updateDashboardStats(); // Update dashboard after class creation
    } else {
      alert(result.error || 'Failed to create class');
    }
  } catch (error) {
    console.error('Error creating class:', error);
    alert('Error creating class. Please try again.');
  }
}

// Render class list
function renderClassList() {
  const classList = document.getElementById('class-list');
  classList.innerHTML = '';
  
  if (classes.length === 0) {
    classList.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-book-open"></i>
        <h3>No Classes Created</h3>
        <p>Create your first class to get started</p>
      </div>
    `;
    return;
  }
  
  classes.forEach(classItem => {
    const classCard = document.createElement('div');
    classCard.className = 'class-card';
    // Bug Fix: Check for students/materials/assignments length as they may be undefined/null in mocked data
    const studentCount = classItem.students ? classItem.students.length : 0;
    const materialsCount = classItem.materials ? classItem.materials.length : 0;
    const assignmentsCount = classItem.assignments ? classItem.assignments.length : 0;

    classCard.innerHTML = `
      <div class="class-card-header">
        <h3>${classItem.name}</h3>
        <span class="class-code">${classItem.code}</span>
      </div>
      <p class="class-description">${classItem.description || 'No description provided'}</p>
      <div class="class-stats">
        <span><i class="fas fa-users"></i> ${studentCount} Students</span>
        <span><i class="fas fa-file-alt"></i> ${materialsCount} Materials</span>
        <span><i class="fas fa-tasks"></i> ${assignmentsCount} Assignments</span>
      </div>
      <div class="class-actions">
        <button class="btn-primary" onclick="openClass('${classItem.id}')">Open Class</button>
        <button class="btn-secondary" onclick="copyClassCode('${classItem.code}')">
          <i class="fas fa-copy"></i> Copy Code
        </button>
        <button class="btn-danger" onclick="deleteClass('${classItem.id}')">
          <i class="fas fa-trash"></i> Delete
        </button>
      </div>
    `;
    classList.appendChild(classCard);
  });
}

// Delete class
async function deleteClass(classId) {
  if (!confirm('Are you sure you want to delete this class? This action cannot be undone.')) {
    return;
  }

  try {
    const response = await fetch(`/api/professor/classes/${classId}`, { // Changed to use classId in URL for REST consistency
      method: 'DELETE',
    });

    const result = await response.json();

    if (response.ok) {
      // Remove the class from the local array
      classes = classes.filter(c => c.id !== classId);
      renderClassList();
      alert('Class deleted successfully!');
      updateDashboardStats(); // Update dashboard after class deletion
    } else {
      alert(result.error || 'Failed to delete class');
    }
  } catch (error) {
    console.error('Error deleting class:', error);
    alert('Error deleting class. Please try again.');
  }
}

// Copy class code to clipboard
function copyClassCode(code) {
  navigator.clipboard.writeText(code).then(() => {
    alert('Class code copied to clipboard!');
  });
}

// Open class view
function openClass(classId) {
  currentClassId = classId;
  const classItem = classes.find(c => c.id === classId);
  
  if (!classItem) return;
  
  // Bug Fix: Check if students/materials/assignments are defined before accessing length
  const studentsCount = classItem.students ? classItem.students.length : 0;
  const materialsCount = classItem.materials ? classItem.materials.length : 0;
  const assignmentsCount = classItem.assignments ? classItem.assignments.length : 0;

  // Update class view header
  document.getElementById('class-title').textContent = classItem.name;
  document.getElementById('class-desc').textContent = classItem.description || 'No description provided';
  document.getElementById('class-students').textContent = studentsCount;
  document.getElementById('class-materials').textContent = materialsCount;
  document.getElementById('class-assignments').textContent = assignmentsCount;
  
  // Hide enrolled section and show class view
  document.getElementById('enrolled-section').classList.remove('active');
  document.getElementById('class-view').classList.remove('hidden');
  document.getElementById('class-view').classList.add('active');

  
  // Load class content
  loadClassPosts();
  loadClassStudents();
  loadClassAssignments();
  loadClassGrades();
}

// Switch tabs in class view
function switchTab(tabName) {
  // Hide all tab contents
  document.querySelectorAll('.tab-content').forEach(tab => {
    tab.classList.remove('active');
  });
  
  // Remove active class from all tab buttons
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  
  // Show selected tab content and activate button
  document.getElementById(`${tabName}-tab`).classList.add('active');
  document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
}

// Load class posts/materials
function loadClassPosts() {
  const classItem = classes.find(c => c.id === currentClassId);
  const postsContainer = document.getElementById('posts-container');
  
  if (!classItem || !postsContainer) return;
  
  postsContainer.innerHTML = '';
  
  if (!classItem.materials || classItem.materials.length === 0) { // Bug fix: Check if materials exists
    postsContainer.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-file-upload"></i>
        <h3>No Materials Posted</h3>
        <p>Upload your first material to get started</p>
      </div>
    `;
    return;
  }
  
  // Sort materials by date (most recent first)
  const sortedMaterials = classItem.materials.sort((a, b) => new Date(b.date) - new Date(a.date));

  sortedMaterials.forEach(material => {
    const postElement = document.createElement('div');
    postElement.className = 'post-card';
    postElement.innerHTML = `
      <div class="post-header">
        <h4>${material.title}</h4>
        <span class="post-date">${new Date(material.date).toLocaleDateString()}</span>
      </div>
      <p class="post-description">${material.description}</p>
      ${material.deadline ? `<p class="post-deadline"><strong>Deadline:</strong> ${new Date(material.deadline).toLocaleDateString()}</p>` : ''}
      ${material.resourceLink ? `<p class="post-link"><a href="${material.resourceLink}" target="_blank">${material.resourceLink}</a></p>` : ''}
      ${material.files && material.files.length > 0 ? `
        <div class="post-files">
          <strong>Attached Files:</strong>
          <ul>
            ${material.files.map(file => `
              <li>
                <a href="#" onclick="downloadFile('${file.name.replace(/'/g, "\\'")}', '${file.content.replace(/'/g, "\\'")}')">
                  <i class="fas fa-download"></i> ${file.name}
                </a>
              </li>
            `).join('')}
          </ul>
        </div>
      ` : ''}
    `;
    postsContainer.appendChild(postElement);
  });
}

// Upload material
function uploadMaterial() {
  const title = document.getElementById('upload-title').value.trim();
  const description = document.getElementById('upload-description').value.trim();
  const deadline = document.getElementById('upload-deadline').value;
  const resourceLink = document.getElementById('resource-link').value.trim();
  const filesInput = document.getElementById('lesson-file');
  
  if (!title) {
    alert('Please enter a title');
    return;
  }
  
  const classItem = classes.find(c => c.id === currentClassId);
  if (!classItem) {
    alert('Error: Class not found.');
    return;
  }
  
  const material = {
    id: Date.now().toString(),
    title,
    description,
    date: new Date().toISOString(),
    deadline: deadline || null,
    resourceLink: resourceLink || null,
    files: []
  };
  
  // Handle file uploads
  if (filesInput.files.length > 0) {
    const filesToRead = Array.from(filesInput.files);
    let filesReadCount = 0;
    
    filesToRead.forEach(file => {
      const reader = new FileReader();
      
      reader.onload = function(e) {
        material.files.push({
          name: file.name,
          type: file.type,
          content: e.target.result // Base64 content
        });
        
        filesReadCount++;
        
        // Bug Fix: Only call saveMaterial once after ALL files have been processed
        if (filesReadCount === filesToRead.length) {
          saveMaterial(material);
        }
      };
      
      reader.readAsDataURL(file);
    });
  } else {
    // If no files, save the material immediately
    saveMaterial(material);
  }
}

// Save material to class
async function saveMaterial(material) {
  const classItem = classes.find(c => c.id === currentClassId);
  if (!classItem) return;
  
  // Mock API call to save material (Assuming a POST endpoint for materials)
  try {
    const response = await fetch(`/api/professor/classes/${currentClassId}/materials`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(material)
    });

    if (response.ok) {
      // Add the new material to the local array
      classItem.materials.push(material);
      
      // Update UI
      loadClassPosts(); // Bug Fix: Refresh the materials list, not the entire class list
      
      // Update class stats in header and dashboard
      document.getElementById('class-materials').textContent = classItem.materials.length;
      updateDashboardStats(); 

      // Reset and hide upload form
      document.getElementById('upload-form').classList.add('hidden');
      resetUploadForm();
      
      alert('Material posted successfully!');
    } else {
      const result = await response.json();
      alert(result.error || 'Failed to post material');
    }
  } catch (error) {
    console.error('Error posting material:', error);
    // Even on error, update locally for demo purposes if preferred, but inform user
    // classItem.materials.push(material);
    // loadClassPosts();
    // document.getElementById('class-materials').textContent = classItem.materials.length;
    alert('Error posting material. Please try again.');
  }
}

// Reset upload form
function resetUploadForm() {
  document.getElementById('upload-title').value = '';
  document.getElementById('upload-description').value = '';
  document.getElementById('upload-deadline').value = '';
  document.getElementById('resource-link').value = '';
  document.getElementById('lesson-file').value = '';
  document.getElementById('file-chosen').textContent = 'No files selected';
}

// Load class students
function loadClassStudents() {
  const classItem = classes.find(c => c.id === currentClassId);
  const studentsList = document.getElementById('students-list');
  
  if (!classItem || !studentsList) return;
  
  studentsList.innerHTML = '';
  
  if (!classItem.students || classItem.students.length === 0) { // Bug fix: Check if students array exists
    studentsList.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-users"></i>
        <h3>No Students Enrolled</h3>
        <p>Students can join using the class code: <strong>${classItem.code}</strong></p>
      </div>
    `;
    return;
  }
  
  classItem.students.forEach(student => {
    // Bug fix: Fallback for missing student name or email
    const studentName = student.name || 'Student';
    const studentEmail = student.email || 'N/A';
    
    const studentElement = document.createElement('div');
    studentElement.className = 'student-item';
    studentElement.innerHTML = `
      <div class="student-info">
        <img src="https://ui-avatars.com/api/?name=${studentName}&background=4a90a4&color=fff" alt="${studentName}" class="avatar">
        <div>
          <h4>${studentName}</h4>
          <p>${student.id} • ${studentEmail}</p>
        </div>
      </div>
      <div class="student-stats">
        <span>Assignments: ${student.assignmentCount || 0}</span>
        <span>Average: ${student.averageGrade || 'N/A'}%</span>
      </div>
    `;
    studentsList.appendChild(studentElement);
  });
}

// Create assignment
function createAssignment() {
  // Bug fix: The original file had a redundant createAssignment function that only showed the modal.
  // The functionality is now directly tied to the button in DOMContentLoaded.
  document.getElementById('assignment-modal').style.display = 'flex';
}

// Save assignment
function saveAssignment() {
  const title = document.getElementById('assignment-title').value.trim();
  const description = document.getElementById('assignment-description').value.trim();
  const dueDate = document.getElementById('assignment-due-date').value;
  const points = document.getElementById('assignment-points').value;
  const instructions = document.getElementById('assignment-instructions').value.trim();
  const filesInput = document.getElementById('assignment-files');
  
  if (!title || !description || !dueDate) {
    alert('Please fill in all required fields (Title, Description, Due Date)');
    return;
  }
  
  const classItem = classes.find(c => c.id === currentClassId);
  if (!classItem) {
    alert('Error: Class not found.');
    return;
  }
  
  const assignment = {
    id: Date.now().toString(),
    title,
    description,
    dueDate,
    points: parseInt(points) || 100,
    instructions: instructions || '',
    dateCreated: new Date().toISOString(),
    submissions: [],
    files: []
  };
  
  // Handle file uploads for assignment
  if (filesInput.files.length > 0) {
    const filesToRead = Array.from(filesInput.files);
    let filesReadCount = 0;
    
    filesToRead.forEach(file => {
      const reader = new FileReader();
      
      reader.onload = function(e) {
        assignment.files.push({
          name: file.name,
          type: file.type,
          content: e.target.result // Base64 content
        });
        
        filesReadCount++;
        
        // Bug Fix: Only call saveAssignmentToClass once after ALL files have been processed
        if (filesReadCount === filesToRead.length) {
          saveAssignmentToClass(assignment);
        }
      };
      
      reader.readAsDataURL(file);
    });
  } else {
    saveAssignmentToClass(assignment);
  }
}

// Save assignment to class
async function saveAssignmentToClass(assignment) {
  const classItem = classes.find(c => c.id === currentClassId);
  if (!classItem) return;
  
  // Mock API call to save assignment (Assuming a POST endpoint for assignments)
  try {
    const response = await fetch(`/api/professor/classes/${currentClassId}/assignments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(assignment)
    });

    if (response.ok) {
      // Add the new assignment to the local array
      classItem.assignments.push(assignment);
      
      // Update UI
      loadClassAssignments(); // Bug Fix: Refresh the assignments list
      document.getElementById('class-assignments').textContent = classItem.assignments.length;
      updateDashboardStats(); // Update dashboard after assignment creation
      
      // Close modal and reset form
      assignmentModal.style.display = 'none'; // Bug fix: Use the element variable
      resetAssignmentForm();
      
      alert('Assignment created successfully!');
    } else {
      const result = await response.json();
      alert(result.error || 'Failed to create assignment');
    }
  } catch (error) {
    console.error('Error creating assignment:', error);
    alert('Error creating assignment. Please try again.');
  }
}

// Reset assignment form
function resetAssignmentForm() {
  document.getElementById('assignment-title').value = '';
  document.getElementById('assignment-description').value = '';
  document.getElementById('assignment-due-date').value = '';
  document.getElementById('assignment-points').value = '100';
  document.getElementById('assignment-instructions').value = '';
  document.getElementById('assignment-files').value = '';
  document.getElementById('assignment-files-chosen').textContent = 'No files selected';
}

// Load class assignments
function loadClassAssignments() {
  const classItem = classes.find(c => c.id === currentClassId);
  const assignmentsContainer = document.getElementById('assignments-container');
  
  if (!classItem || !assignmentsContainer) return;
  
  assignmentsContainer.innerHTML = '';
  
  if (!classItem.assignments || classItem.assignments.length === 0) { // Bug fix: Check if assignments array exists
    assignmentsContainer.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-tasks"></i>
        <h3>No Assignments</h3>
        <p>Create your first assignment to get started</p>
      </div>
    `;
    return;
  }
  
  // Sort assignments by due date (soonest first)
  const sortedAssignments = classItem.assignments.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

  sortedAssignments.forEach(assignment => {
    const submissionCount = assignment.submissions ? assignment.submissions.length : 0;
    const gradedCount = assignment.submissions ? assignment.submissions.filter(s => s.grade !== undefined).length : 0;
    
    const assignmentElement = document.createElement('div');
    assignmentElement.className = 'assignment-card';
    assignmentElement.innerHTML = `
      <div class="assignment-header">
        <h4>${assignment.title}</h4>
        <span class="due-date">Due: ${new Date(assignment.dueDate).toLocaleDateString()}</span>
      </div>
      <p class="assignment-description">${assignment.description}</p>
      <div class="assignment-details">
        <span><i class="fas fa-file-alt"></i> ${assignment.points} Points</span>
        <span><i class="fas fa-users"></i> ${submissionCount} Submissions</span>
        <span><i class="fas fa-check-circle"></i> ${gradedCount} Graded</span>
      </div>
      ${assignment.files && assignment.files.length > 0 ? `
        <div class="assignment-files">
          <strong>Resources:</strong>
          <ul>
            ${assignment.files.map(file => `
              <li>
                <a href="#" onclick="downloadFile('${file.name.replace(/'/g, "\\'")}', '${file.content.replace(/'/g, "\\'")}')">
                  <i class="fas fa-download"></i> ${file.name}
                </a>
              </li>
            `).join('')}
          </ul>
        </div>
      ` : ''}
      <div class="assignment-actions">
        <button class="btn-primary" onclick="viewSubmissions('${assignment.id}')">
          <i class="fas fa-eye"></i> View Submissions
        </button>
      </div>
    `;
    assignmentsContainer.appendChild(assignmentElement);
  });
}

// View assignment submissions
function viewSubmissions(assignmentId) {
  const classItem = classes.find(c => c.id === currentClassId);
  if (!classItem) return;
  
  const assignment = classItem.assignments.find(a => a.id === assignmentId);
  if (!assignment) return;
  
  // For demo purposes, we'll show a modal with submissions
  let submissionsHTML = '';
  
  if (!assignment.submissions || assignment.submissions.length === 0) {
    submissionsHTML = 'No submissions yet.';
  } else {
    // Generate a simple text-based summary for the alert
    submissionsHTML = assignment.submissions.map(submission => {
      const student = classItem.students.find(s => s.id === submission.studentId);
      const studentName = student ? student.name : 'Unknown Student';
      const gradeText = submission.grade !== undefined ? 
        `${submission.grade}/${assignment.points}` : 
        'Not graded';
      const feedbackText = submission.feedback ? `Feedback: ${submission.feedback}` : 'No feedback.';
      
      return `\n---
Student: ${studentName}
Submitted: ${new Date(submission.date).toLocaleDateString()}
Grade: ${gradeText}
Content: ${submission.content.substring(0, 50)}...
${feedbackText}
[Click to Grade/Update]`;
    }).join('');
  }
  
  // Bug Fix: Remove the broken HTML stripping and show a simple text summary.
  alert(`Submissions for "${assignment.title}":\n\n${submissionsHTML}`);
}

// Open grading modal
function openGradingModal(assignmentId, studentId) {
  const classItem = classes.find(c => c.id === currentClassId);
  if (!classItem) return;
  
  const assignment = classItem.assignments.find(a => a.id === assignmentId);
  if (!assignment) return;
  
  const submission = assignment.submissions.find(s => s.studentId === studentId);
  if (!submission) {
    alert('Submission not found.');
    return; // Bug Fix: Handle missing submission gracefully
  }
  
  // Get student info
  const student = classItem.students.find(s => s.id === studentId);
  
  // Populate grading modal
  document.getElementById('student-name-display').textContent = student ? student.name : 'Unknown Student'; // Bug Fix: Use a display element, not an input for student name
  document.getElementById('assignment-title-grade-display').textContent = assignment.title; // Bug Fix: Use a display element
  document.getElementById('submission-content-display').textContent = submission.content; // Bug Fix: Use a display element
  document.getElementById('max-points-display').textContent = `Max Points: ${assignment.points}`; // Display max points
  document.getElementById('grade-score').value = submission.grade || '';
  document.getElementById('grade-feedback').value = submission.feedback || '';
  
  // Show modal
  document.getElementById('grading-modal').style.display = 'flex';
  
  // Store current assignment and student for saving
  document.getElementById('grading-modal').dataset.assignmentId = assignmentId;
  document.getElementById('grading-modal').dataset.studentId = studentId;
}

// Save grade
async function saveGrade() {
  const modalEl = document.getElementById('grading-modal');
  const assignmentId = modalEl.dataset.assignmentId;
  const studentId = modalEl.dataset.studentId;
  const grade = parseInt(document.getElementById('grade-score').value);
  const feedback = document.getElementById('grade-feedback').value.trim();
  
  const classItem = classes.find(c => c.id === currentClassId);
  if (!classItem) return;
  
  const assignment = classItem.assignments.find(a => a.id === assignmentId);
  if (!assignment) return;

  // Bug Fix: Get max points for validation
  const maxPoints = assignment.points;
  
  if (isNaN(grade) || grade < 0 || grade > maxPoints) { // Bug Fix: Validate against max points
    alert(`Please enter a valid grade between 0 and ${maxPoints}`);
    return;
  }
  
  const submission = assignment.submissions.find(s => s.studentId === studentId);
  if (!submission) return;
  
  // Mock API call to save grade (Assuming a PUT endpoint for submissions)
  try {
    const response = await fetch(`/api/professor/classes/${currentClassId}/assignments/${assignmentId}/submissions/${studentId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ grade: grade, feedback: feedback })
    });

    if (response.ok) {
      // Update submission with grade and feedback
      submission.grade = grade;
      submission.feedback = feedback;
      submission.gradedDate = new Date().toISOString();
      
      // Update UI elements (assignments list and grades table)
      loadClassAssignments(); 
      loadClassGrades();
      
      // Close modal
      modalEl.style.display = 'none';
      alert('Grade saved successfully!');
    } else {
      const result = await response.json();
      alert(result.error || 'Failed to save grade');
    }
  } catch (error) {
    console.error('Error saving grade:', error);
    alert('Error saving grade. Please try again.');
  }
}

// Load class grades
function loadClassGrades() {
  const classItem = classes.find(c => c.id === currentClassId);
  const gradesContainer = document.getElementById('grades-container');
  
  if (!classItem || !gradesContainer) return;
  
  gradesContainer.innerHTML = '';
  
  if (!classItem.students || classItem.students.length === 0) { // Bug fix: Check if students array exists
    gradesContainer.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-chart-line"></i>
        <h3>No Student Grades</h3>
        <p>Grades will appear here once students submit assignments</p>
      </div>
    `;
    return;
  }
  
  // Create grades table
  let gradesHTML = `
    <div class="grades-table">
      <table>
        <thead>
          <tr>
            <th>Student</th>
            <th>Student ID</th>
  `;
  
  // Add assignment columns
  classItem.assignments.forEach(assignment => {
    gradesHTML += `<th>${assignment.title} (${assignment.points}pts)</th>`;
  });
  
  gradesHTML += `
            <th>Average</th>
          </tr>
        </thead>
        <tbody>
  `;
  
  // Add student rows
  classItem.students.forEach(student => {
    gradesHTML += `
      <tr>
        <td>${student.name}</td>
        <td>${student.id}</td>
    `;
    
    let totalScore = 0;
    let totalMaxPoints = 0;
    
    // Add grades for each assignment
    classItem.assignments.forEach(assignment => {
      const submission = assignment.submissions.find(s => s.studentId === student.id);
      if (submission && submission.grade !== undefined) {
        gradesHTML += `<td>${submission.grade}/${assignment.points}</td>`;
        totalScore += submission.grade;
        totalMaxPoints += assignment.points;
      } else {
        gradesHTML += '<td>-</td>';
      }
    });
    
    // Calculate average
    const average = totalMaxPoints > 0 ? ((totalScore / totalMaxPoints) * 100).toFixed(2) : '-';
    // Update student local stats for display in student-list
    student.averageGrade = average !== '-' ? average : 'N/A';
    student.assignmentCount = classItem.assignments.length;
    
    gradesHTML += `<td>${average}${average !== '-' ? '%' : ''}</td>`; // Display average as a percentage
    
    gradesHTML += `</tr>`;
  });
  
  gradesHTML += `
        </tbody>
      </table>
    </div>
  `;
  
  gradesContainer.innerHTML = gradesHTML;
}

// Export student list
function exportStudentList() {
  const classItem = classes.find(c => c.id === currentClassId);
  if (!classItem || !classItem.students || classItem.students.length === 0) {
    alert('No students to export');
    return;
  }
  
  let csvContent = 'Name,Student ID,Email\n';
  classItem.students.forEach(student => {
    // Bug Fix: Ensure no commas in data break CSV format (simple fix for demo)
    const name = (student.name || '').replace(/,/g, '');
    const email = (student.email || '').replace(/,/g, '');
    csvContent += `${name},${student.id},${email}\n`;
  });
  
  downloadCSV(csvContent, `${classItem.name}_students.csv`);
}

// Export grades
function exportGrades() {
  const classItem = classes.find(c => c.id === currentClassId);
  if (!classItem) return;
  
  let csvContent = 'Student,Student ID';
  
  // Add assignment headers
  classItem.assignments.forEach(assignment => {
    csvContent += `,"${assignment.title} (Score)","${assignment.title} (Points)"`; // Export score and max points
  });
  
  csvContent += ',Average (%)\n';
  
  // Add student data
  classItem.students.forEach(student => {
    csvContent += `"${student.name}",${student.id}`;
    
    let totalScore = 0;
    let totalMaxPoints = 0;
    
    classItem.assignments.forEach(assignment => {
      const submission = assignment.submissions.find(s => s.studentId === student.id);
      if (submission && submission.grade !== undefined) {
        csvContent += `,${submission.grade},${assignment.points}`;
        totalScore += submission.grade;
        totalMaxPoints += assignment.points;
      } else {
        csvContent += ',-,-';
      }
    });
    
    const average = totalMaxPoints > 0 ? ((totalScore / totalMaxPoints) * 100).toFixed(2) : '-';
    csvContent += `,${average}\n`;
  });
  
  downloadCSV(csvContent, `${classItem.name}_grades.csv`);
}

// Download CSV file
function downloadCSV(content, filename) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' }); // Added charset for broader compatibility
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Download file
function downloadFile(filename, content) {
  // Bug fix: Check if content is valid before trying to convert/download
  if (!content) {
    alert('File content is empty or corrupt.');
    return;
  }
  try {
    const blob = base64ToBlob(content);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (e) {
    console.error('Error downloading file:', e);
    alert('Error downloading file. Content might be invalid.');
  }
}

// Convert base64 to Blob
function base64ToBlob(base64) {
  const parts = base64.split(';base64,');
  if (parts.length !== 2) {
    throw new Error('Invalid base64 format for Blob conversion.');
  }
  const contentType = parts[0].split(':')[1];
  const raw = window.atob(parts[1]);
  const uInt8Array = new Uint8Array(raw.length);
  
  for (let i = 0; i < raw.length; ++i) {
    uInt8Array[i] = raw.charCodeAt(i);
  }
  
  return new Blob([uInt8Array], { type: contentType });
}

// Calendar functionality
function initializeCalendar() {
  const monthYear = document.getElementById('month-year');
  const calendarDays = document.getElementById('calendar-days');
  const prevMonth = document.getElementById('prev-month');
  const nextMonth = document.getElementById('next-month');
  
  let currentDate = new Date();
  
  function renderCalendar() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    // Update month-year display
    monthYear.textContent = `${currentDate.toLocaleString('default', { month: 'long' })} ${year}`;
    
    // Clear previous days
    calendarDays.innerHTML = '';
    
    // Get first day of month (0=Sunday, 6=Saturday)
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    // Add empty cells for days before first day of month
    // Bug Fix: Adjusting for calendar starting on Sunday (getDay())
    for (let i = 0; i < firstDay; i++) {
      const emptyCell = document.createElement('div');
      emptyCell.className = 'calendar-day empty';
      calendarDays.appendChild(emptyCell);
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dayElement = document.createElement('div');
      dayElement.className = 'calendar-day';
      dayElement.textContent = day;
      
      const dateKey = `${year}-${month + 1}-${day}`;
      if (calendarEvents[dateKey] && calendarEvents[dateKey].length > 0) { // Bug Fix: Check if events array is not empty
        dayElement.classList.add('has-event');
      }
      
      dayElement.addEventListener('click', () => openEventModal(year, month, day));
      calendarDays.appendChild(dayElement);
    }
  }
  
  prevMonth.addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() - 1);
    renderCalendar();
  });
  
  nextMonth.addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() + 1);
    renderCalendar();
  });
  
  renderCalendar();
}

// Function to update the selected date in the modal before showing it
let currentSelectedDate = null;

function openEventModal(year, month, day) {
  const selectedDateEl = document.getElementById('selected-date');
  const eventList = document.getElementById('event-list');
  
  const date = new Date(year, month, day);
  currentSelectedDate = date; // Store the date object globally for use in save-event
  selectedDateEl.textContent = date.toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  
  const dateKey = `${year}-${month + 1}-${day}`;
  const events = calendarEvents[dateKey] || [];
  
  eventList.innerHTML = '';
  if (events.length === 0) {
    eventList.innerHTML = '<li class="empty-event-li">No events for this day</li>';
  } else {
    events.forEach(event => {
      const li = document.createElement('li');
      li.textContent = event;
      eventList.appendChild(li);
    });
  }
  
  // Clear event text input when opening modal
  document.getElementById('event-text').value = ''; 

  document.getElementById('event-modal').style.display = 'flex';
}

document.getElementById('close-event').addEventListener('click', () => {
  document.getElementById('event-modal').style.display = 'none';
});

document.getElementById('save-event').addEventListener('click', () => {
  const eventText = document.getElementById('event-text').value.trim();
  if (!eventText) return;
  
  if (!currentSelectedDate) { // Bug Fix: Ensure a date is selected
    alert('Error: No date selected.');
    return;
  }
  
  // Use the globally stored date object
  const dateKey = `${currentSelectedDate.getFullYear()}-${currentSelectedDate.getMonth() + 1}-${currentSelectedDate.getDate()}`;
  
  if (!calendarEvents[dateKey]) {
    calendarEvents[dateKey] = [];
  }
  
  calendarEvents[dateKey].push(eventText);
  document.getElementById('event-text').value = '';
  document.getElementById('event-modal').style.display = 'none';
  
  // Re-render calendar to show event indicators
  initializeCalendar();
  alert('Event saved successfully!');
});

// Update dashboard statistics
async function updateDashboardStats() {
  try {
    const response = await fetch('/api/professor/stats');
    if (response.ok) {
      const stats = await response.json();
      
      document.getElementById('total-classes').textContent = stats.total_classes;
      document.getElementById('total-students').textContent = stats.total_students;
      document.getElementById('pending-tasks').textContent = stats.pending_tasks;
      document.getElementById('upcoming-deadlines').textContent = stats.upcoming_deadlines;
    } else {
      // Fallback to calculated stats if API fails
      calculateDashboardStats();
    }
  } catch (error) {
    console.error('Error fetching stats:', error);
    calculateDashboardStats();
  }
  
  // Update deadline list
  updateDeadlineList();
  
  // Update activity list
  updateActivityList();
}

// Calculate dashboard stats locally (fallback)
function calculateDashboardStats() {
  document.getElementById('total-classes').textContent = classes.length;
  
  let totalStudents = 0;
  classes.forEach(classItem => {
    // Bug Fix: Check if students array exists
    totalStudents += classItem.students ? classItem.students.length : 0;
  });
  document.getElementById('total-students').textContent = totalStudents;
  
  // Calculate pending tasks (assignments due soon)
  let pendingTasks = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Normalize today's date
  
  classes.forEach(classItem => {
    // Bug Fix: Check if assignments array exists
    if (classItem.assignments) {
      classItem.assignments.forEach(assignment => {
        const dueDate = new Date(assignment.dueDate);
        dueDate.setHours(23, 59, 59, 999); // Set to end of day
        if (dueDate > today) {
          pendingTasks++;
        }
      });
    }
  });
  document.getElementById('pending-tasks').textContent = pendingTasks;
  
  // Calculate upcoming deadlines (within 7 days)
  let upcomingDeadlines = 0;
  const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
  nextWeek.setHours(23, 59, 59, 999); // Set to end of the week
  
  classes.forEach(classItem => {
    // Bug Fix: Check if assignments array exists
    if (classItem.assignments) {
      classItem.assignments.forEach(assignment => {
        const dueDate = new Date(assignment.dueDate);
        dueDate.setHours(23, 59, 59, 999);
        if (dueDate > today && dueDate <= nextWeek) {
          upcomingDeadlines++;
        }
      });
    }
  });
  document.getElementById('upcoming-deadlines').textContent = upcomingDeadlines;
}

function updateDeadlineList() {
  const deadlineList = document.getElementById('deadline-list');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  let allDeadlines = [];
  classes.forEach(classItem => {
    // Bug Fix: Check if assignments array exists
    if (classItem.assignments) {
      classItem.assignments.forEach(assignment => {
        const dueDate = new Date(assignment.dueDate);
        dueDate.setHours(23, 59, 59, 999);
        if (dueDate > today) {
          allDeadlines.push({
            title: assignment.title,
            dueDate: dueDate,
            class: classItem.name
          });
        }
      });
    }
  });
  
  // Sort by due date
  allDeadlines.sort((a, b) => a.dueDate - b.dueDate);
  
  // Take top 5
  allDeadlines = allDeadlines.slice(0, 5);
  
  deadlineList.innerHTML = '';
  if (allDeadlines.length === 0) {
    deadlineList.innerHTML = '<div class="empty-message">No upcoming deadlines</div>';
    return;
  }
  
  allDeadlines.forEach(deadline => {
    const deadlineElement = document.createElement('div');
    deadlineElement.className = 'deadline-item';
    deadlineElement.innerHTML = `
      <div class="deadline-info">
        <h4>${deadline.title}</h4>
        <p>${deadline.class}</p>
      </div>
      <div class="deadline-date">
        ${deadline.dueDate.toLocaleDateString()}
      </div>
    `;
    deadlineList.appendChild(deadlineElement);
  });
}

function updateActivityList() {
  const activityList = document.getElementById('activity-list');
  
  // For demo purposes, create some sample activities
  // Bug fix: Added new activity for the fixed saveGrade functionality to be complete.
  const activities = [
    { action: 'graded', item: 'Submission for Advanced Algorithms', time: '10 minutes ago' },
    { action: 'created', item: 'Data Structures class', time: '2 hours ago' },
    { action: 'uploaded', item: 'Lecture notes for Algorithms', time: '1 day ago' },
    { action: 'created', item: 'Assignment 1: Linked Lists', time: '2 days ago' },
    { action: 'graded', item: '5 submissions for Assignment 1', time: '3 days ago' }
  ];
  
  activityList.innerHTML = '';
  activities.forEach(activity => {
    const activityElement = document.createElement('div');
    activityElement.className = 'activity-item';
    activityElement.innerHTML = `
      <div class="activity-icon">
        <i class="fas fa-${getActivityIcon(activity.action)}"></i>
      </div>
      <div class="activity-details">
        <p>You ${activity.action} <strong>${activity.item}</strong></p>
        <span class="activity-time">${activity.time}</span>
      </div>
    `;
    activityList.appendChild(activityElement);
  });
}

function getActivityIcon(action) {
  switch(action) {
    case 'created': return 'plus-circle';
    case 'uploaded': return 'file-upload';
    case 'graded': return 'check-circle';
    default: return 'circle';
  }
}

// Profile Section Functionality
document.addEventListener('DOMContentLoaded', function() {
  // Avatar upload functionality
  const avatarUpload = document.getElementById('avatar-upload');
  const profileAvatar = document.getElementById('profile-avatar');
  const topbarAvatar = document.getElementById('topbar-avatar');
  
  if (avatarUpload && profileAvatar && topbarAvatar) { // Bug Fix: Check if elements exist
    avatarUpload.addEventListener('change', function(e) {
      const file = e.target.files[0];
      if (file) {
        // Simple file type validation
        if (!file.type.startsWith('image/')) {
          showMessage('Please select an image file.', 'error');
          return;
        }

        const reader = new FileReader();
        reader.onload = function(e) {
          profileAvatar.src = e.target.result;
          topbarAvatar.src = e.target.result;
          showMessage('Profile picture updated successfully!', 'success');
        };
        reader.readAsDataURL(file);
      }
    });
  }
  
  // Password update functionality
  const updatePasswordBtn = document.getElementById('update-password');
  if (updatePasswordBtn) {
    updatePasswordBtn.addEventListener('click', async function() {
      const currentPassword = document.getElementById('current-password').value;
      const newPassword = document.getElementById('new-password').value;
      const confirmPassword = document.getElementById('confirm-password').value;
      
      if (!currentPassword || !newPassword || !confirmPassword) {
        showMessage('Please fill in all password fields.', 'error');
        return;
      }
      
      if (newPassword.length < 8) {
        showMessage('Password must be at least 8 characters long.', 'error');
        return;
      }
      
      if (newPassword !== confirmPassword) {
        showMessage('New passwords do not match.', 'error');
        return;
      }
      
      // Prevent double-clicking
      updatePasswordBtn.disabled = true;

      try {
        const response = await fetch('/api/profile/update-password', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            current_password: currentPassword,
            new_password: newPassword
          })
        });

        const result = await response.json();
        updatePasswordBtn.disabled = false; // Re-enable button

        if (response.ok) {
          // Clear password fields on success
          document.getElementById('current-password').value = '';
          document.getElementById('new-password').value = '';
          document.getElementById('confirm-password').value = '';
          showMessage('Password updated successfully!', 'success');
        } else {
          showMessage(result.error || 'Failed to update password', 'error');
        }
      } catch (error) {
        console.error('Error updating password:', error);
        updatePasswordBtn.disabled = false; // Re-enable button
        showMessage('Error updating password. Please try again.', 'error');
      }
    });
  }
  
  // Settings tabs functionality
  const settingsTabs = document.querySelectorAll('.settings-tab');
  settingsTabs.forEach(tab => {
    tab.addEventListener('click', function() {
      const tabName = this.getAttribute('data-tab');
      
      // Remove active class from all tabs and panels
      settingsTabs.forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.settings-panel').forEach(p => p.classList.remove('active'));
      
      // Add active class to clicked tab and corresponding panel
      this.classList.add('active');
      document.getElementById(`${tabName}-settings`).classList.add('active');
    });
  });
});

// Helper function to show messages
function showMessage(message, type) {
  const messageEl = document.getElementById('profile-message');
  if (!messageEl) return; // Bug Fix: Check if element exists
  
  messageEl.textContent = message;
  messageEl.className = `profile-message ${type}`;
  messageEl.style.display = 'block';
  
  setTimeout(() => {
    messageEl.style.display = 'none';
  }, 5000);
}