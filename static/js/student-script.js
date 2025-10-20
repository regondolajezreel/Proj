// Student Dashboard JavaScript

// Global variables
let currentClassId = null;
let enrolledClasses = [];
let assignments = [];
let submissions = [];
let calendarEvents = {};

// DOM Elements
const sidebar = document.getElementById('sidebar');
const contentSections = document.querySelectorAll('.content-section');
const navLinks = document.querySelectorAll('.sidebar nav a');
const profileDropdown = document.getElementById('profile-dropdown');
const dropdownMenu = document.getElementById('dropdown-menu');

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
  
  // Load enrolled classes from API
  loadEnrolledClasses();
  
  // Initialize calendar
  initializeCalendar();
  
  // Event listeners for class management
  document.getElementById('join-class-btn').addEventListener('click', showJoinClassModal);
  document.getElementById('cancel-join-class').addEventListener('click', hideJoinClassModal);
  document.getElementById('join-class').addEventListener('click', joinClass);
  
  // Back to classes button
  document.getElementById('back-to-classes').addEventListener('click', () => {
    // Hide class view
    const classView = document.getElementById('class-view');
    classView.classList.add('hidden');
    classView.classList.remove('active');

    // Show My Classes section
    const classesSection = document.getElementById('classes-section');
    classesSection.classList.add('active');
  });

  
  // Tab switching
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      const tabName = this.getAttribute('data-tab');
      switchTab(tabName);
    });
  });
  
  // Assignment filter
  document.getElementById('assignment-filter').addEventListener('change', function() {
    filterAssignments(this.value);
  });
  
  // Grade filter
  document.getElementById('grade-filter').addEventListener('change', function() {
    filterGrades(this.value);
  });
  
  // Submission modal controls
  document.getElementById('close-submission-modal').addEventListener('click', function() {
    document.getElementById('submission-modal').style.display = 'none';
  });
  
  document.getElementById('submit-assignment').addEventListener('click', submitAssignment);
  
  // Submission files display
  document.getElementById('submission-files').addEventListener('change', function() {
    const fileChosen = document.getElementById('submission-files-chosen');
    if (this.files.length > 0) {
      fileChosen.textContent = `${this.files.length} file(s) selected`;
    } else {
      fileChosen.textContent = 'No files selected';
    }
  });
});

// Load enrolled classes from API
async function loadEnrolledClasses() {
  try {
    const response = await fetch('/api/professor/classes');
    if (response.ok) {
      enrolledClasses = await response.json();
      renderClassList();
      updateDashboardStats();
      updateGradeFilter();
    } else {
      console.error('Failed to load classes:', response.status);
    }
  } catch (error) {
    console.error('Error loading classes:', error);
  }
}

// Show join class modal
function showJoinClassModal() {
  document.getElementById('join-class-modal').style.display = 'flex';
}

// Hide join class modal
function hideJoinClassModal() {
  document.getElementById('join-class-modal').style.display = 'none';
  document.getElementById('class-code-input').value = '';
}

// Join class using code
async function joinClass() {
  const classCode = document.getElementById('class-code-input').value.trim().toUpperCase();
  
  if (!classCode) {
    alert('Please enter a class code');
    return;
  }
  
  try {
    const response = await fetch('/api/student/join_class', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code: classCode })
    });

    const result = await response.json();

    if (response.ok) {
      alert(`Successfully joined ${result.class.name}!`);
      hideJoinClassModal();
      // Reload classes to show the newly joined class
      loadEnrolledClasses();
    } else {
      alert(result.error || 'Failed to join class');
    }
  } catch (error) {
    console.error('Error joining class:', error);
    alert('Error joining class. Please try again.');
  }
}

// Render class list
function renderClassList() {
  const classList = document.getElementById('class-list');
  classList.innerHTML = '';
  
  if (enrolledClasses.length === 0) {
    classList.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-book-open"></i>
        <h3>No Classes Enrolled</h3>
        <p>Join a class using a class code from your professor</p>
      </div>
    `;
    return;
  }
  
  enrolledClasses.forEach(classItem => {
    const pendingAssignments = classItem.assignments ? 
      classItem.assignments.filter(a => {
        const submission = a.submissions ? a.submissions.find(s => s.studentId === studentData.id) : null;
        return !submission && new Date(a.dueDate) > new Date();
      }).length : 0;
    
    const classCard = document.createElement('div');
    classCard.className = 'class-card';
    classCard.innerHTML = `
      <div class="class-card-header">
        <h3>${classItem.name}</h3>
        <span class="class-code">${classItem.code}</span>
      </div>
      <p class="class-description">${classItem.description || 'No description provided'}</p>
      <div class="class-stats">
        <span><i class="fas fa-user-tie"></i> ${classItem.professor_name || 'Professor'}</span>
        <span><i class="fas fa-file-alt"></i> ${classItem.materials ? classItem.materials.length : 0} Materials</span>
        <span><i class="fas fa-tasks"></i> ${pendingAssignments} Pending</span>
      </div>
      <div class="class-actions">
        <button class="btn-primary" onclick="openClass('${classItem.id}')">Open Class</button>
        <button class="btn-secondary" onclick="unenrollClass('${classItem.id}')">
          <i class="fas fa-sign-out-alt"></i> Unenroll
        </button>
      </div>
    `;
    classList.appendChild(classCard);
  });
}

// Unenroll from class
async function unenrollClass(classId) {
  if (!confirm('Are you sure you want to unenroll from this class?')) {
    return;
  }

  try {
    const response = await fetch('/api/student/unenroll_class', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ class_id: classId })
    });

    const result = await response.json();

    if (response.ok) {
      alert('Successfully unenrolled from class!');
      // Reload classes
      loadEnrolledClasses();
    } else {
      alert(result.error || 'Failed to unenroll from class');
    }
  } catch (error) {
    console.error('Error unenrolling from class:', error);
    alert('Error unenrolling from class. Please try again.');
  }
}

// Open class view
function openClass(classId) {
  currentClassId = classId;
  const classItem = enrolledClasses.find(c => c.id === classId);
  if (!classItem) return;

  // Update class info
  document.getElementById('class-title').textContent = classItem.name;
  document.getElementById('class-desc').textContent = classItem.description;
  document.getElementById('class-professor').textContent = classItem.professor_name || 'Professor';

  // Hide all other sections
  document.querySelectorAll('.content-section').forEach(section => section.classList.remove('active'));

  // Show class view
  const classView = document.getElementById('class-view');
  classView.classList.remove('hidden');
  classView.classList.add('active');

  // Load the class data
  loadClassPosts();
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
  const classItem = enrolledClasses.find(c => c.id === currentClassId);
  const postsContainer = document.getElementById('posts-container');
  
  if (!classItem || !postsContainer) return;
  
  postsContainer.innerHTML = '';
  
  if (!classItem.materials || classItem.materials.length === 0) {
    postsContainer.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-file-upload"></i>
        <h3>No Materials Posted</h3>
        <p>Check back later for class materials</p>
      </div>
    `;
    return;
  }
  
  classItem.materials.forEach(material => {
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
                <a href="#" onclick="downloadFile('${file.name}', '${file.content}')">
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

// Load class assignments
function loadClassAssignments() {
  const classItem = enrolledClasses.find(c => c.id === currentClassId);
  const assignmentsContainer = document.getElementById('assignments-container');
  
  if (!classItem || !assignmentsContainer) return;
  
  assignmentsContainer.innerHTML = '';
  
  if (!classItem.assignments || classItem.assignments.length === 0) {
    assignmentsContainer.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-tasks"></i>
        <h3>No Assignments</h3>
        <p>No assignments have been posted for this class yet</p>
      </div>
    `;
    return;
  }
  
  classItem.assignments.forEach(assignment => {
    const submission = assignment.submissions ? 
      assignment.submissions.find(s => s.studentId === studentData.id) : null;
    
    const isSubmitted = !!submission;
    const isGraded = isSubmitted && submission.grade !== undefined;
    const isOverdue = new Date(assignment.dueDate) < new Date() && !isSubmitted;
    
    const assignmentElement = document.createElement('div');
    assignmentElement.className = `assignment-card ${isOverdue ? 'overdue' : ''} ${isGraded ? 'graded' : ''}`;
    assignmentElement.innerHTML = `
      <div class="assignment-header">
        <h4>${assignment.title}</h4>
        <span class="due-date ${isOverdue ? 'overdue' : ''}">
          Due: ${new Date(assignment.dueDate).toLocaleDateString()}
          ${isOverdue ? ' (Overdue)' : ''}
        </span>
      </div>
      <p class="assignment-description">${assignment.description}</p>
      <div class="assignment-details">
        <span><i class="fas fa-file-alt"></i> ${assignment.points} Points</span>
        <span class="status ${isGraded ? 'graded' : isSubmitted ? 'submitted' : 'pending'}">
          <i class="fas fa-${isGraded ? 'check-circle' : isSubmitted ? 'clock' : 'exclamation-circle'}"></i>
          ${isGraded ? 'Graded' : isSubmitted ? 'Submitted' : 'Not Submitted'}
        </span>
        ${isGraded ? `<span class="grade">Grade: ${submission.grade}/${assignment.points}</span>` : ''}
      </div>
      ${assignment.files && assignment.files.length > 0 ? `
        <div class="assignment-files">
          <strong>Resources:</strong>
          <ul>
            ${assignment.files.map(file => `
              <li>
                <a href="#" onclick="downloadFile('${file.name}', '${file.content}')">
                  <i class="fas fa-download"></i> ${file.name}
                </a>
              </li>
            `).join('')}
          </ul>
        </div>
      ` : ''}
      ${assignment.instructions ? `
        <div class="assignment-instructions">
          <strong>Instructions:</strong>
          <p>${assignment.instructions}</p>
        </div>
      ` : ''}
      <div class="assignment-actions">
        ${!isSubmitted ? `
          <button class="btn-primary" onclick="openSubmissionModal('${assignment.id}')">
            <i class="fas fa-paper-plane"></i> Submit Assignment
          </button>
        ` : `
          <button class="btn-secondary" onclick="viewSubmission('${assignment.id}')">
            <i class="fas fa-eye"></i> View Submission
          </button>
        `}
        ${isGraded && submission.feedback ? `
          <button class="btn-outline" onclick="viewFeedback('${assignment.id}')">
            <i class="fas fa-comment"></i> View Feedback
          </button>
        ` : ''}
      </div>
    `;
    assignmentsContainer.appendChild(assignmentElement);
  });
}

// Open submission modal
function openSubmissionModal(assignmentId) {
  const classItem = enrolledClasses.find(c => c.id === currentClassId);
  if (!classItem) return;
  
  const assignment = classItem.assignments.find(a => a.id === assignmentId);
  if (!assignment) return;
  
  // Store current assignment for submission
  document.getElementById('submission-modal').dataset.assignmentId = assignmentId;
  
  // Reset form
  document.getElementById('submission-text').value = '';
  document.getElementById('submission-files').value = '';
  document.getElementById('submission-files-chosen').textContent = 'No files selected';
  
  // Show modal
  document.getElementById('submission-modal').style.display = 'flex';
}

// Submit assignment
function submitAssignment() {
  const assignmentId = document.getElementById('submission-modal').dataset.assignmentId;
  const submissionText = document.getElementById('submission-text').value.trim();
  const filesInput = document.getElementById('submission-files');
  
  if (!submissionText) {
    alert('Please enter your submission');
    return;
  }
  
  const classItem = enrolledClasses.find(c => c.id === currentClassId);
  if (!classItem) return;
  
  const assignment = classItem.assignments.find(a => a.id === assignmentId);
  if (!assignment) return;
  
  // For demo purposes - in real app, this would call an API
  const submission = {
    studentId: 'current-student-id', // This would come from session
    studentName: 'Current Student', // This would come from session
    content: submissionText,
    date: new Date().toISOString(),
    files: []
  };
  
  // Handle file uploads
  if (filesInput.files.length > 0) {
    for (let i = 0; i < filesInput.files.length; i++) {
      const file = filesInput.files[i];
      const reader = new FileReader();
      
      reader.onload = function(e) {
        submission.files.push({
          name: file.name,
          type: file.type,
          content: e.target.result
        });
        
        // If this is the last file, save the submission
        if (i === filesInput.files.length - 1) {
          saveSubmission(assignment, submission);
        }
      };
      
      reader.readAsDataURL(file);
    }
  } else {
    saveSubmission(assignment, submission);
  }
}

// Save submission to assignment
function saveSubmission(assignment, submission) {
  if (!assignment.submissions) {
    assignment.submissions = [];
  }
  
  // Check if already submitted
  const existingSubmissionIndex = assignment.submissions.findIndex(s => s.studentId === submission.studentId);
  if (existingSubmissionIndex !== -1) {
    assignment.submissions[existingSubmissionIndex] = submission;
  } else {
    assignment.submissions.push(submission);
  }
  
  // Save to enrolledClasses (in real app, this would be an API call)
  saveEnrolledClasses();
  
  // Reload assignments
  loadClassAssignments();
  
  // Close modal
  document.getElementById('submission-modal').style.display = 'none';
  
  alert('Assignment submitted successfully!');
}

// View submission
function viewSubmission(assignmentId) {
  const classItem = enrolledClasses.find(c => c.id === currentClassId);
  if (!classItem) return;
  
  const assignment = classItem.assignments.find(a => a.id === assignmentId);
  if (!assignment) return;
  
  const submission = assignment.submissions.find(s => s.studentId === 'current-student-id');
  if (!submission) return;
  
  let submissionHTML = `
    <h4>Your Submission</h4>
    <p><strong>Submitted:</strong> ${new Date(submission.date).toLocaleString()}</p>
    <p><strong>Content:</strong></p>
    <p>${submission.content}</p>
  `;
  
  if (submission.files && submission.files.length > 0) {
    submissionHTML += `
      <p><strong>Files:</strong></p>
      <ul>
        ${submission.files.map(file => `
          <li>
            <a href="#" onclick="downloadFile('${file.name}', '${file.content}')">
              <i class="fas fa-download"></i> ${file.name}
            </a>
          </li>
        `).join('')}
      </ul>
    `;
  }
  
  if (submission.grade !== undefined) {
    submissionHTML += `
      <p><strong>Grade:</strong> ${submission.grade}/${assignment.points}</p>
    `;
  }
  
  alert(submissionHTML.replace(/<[^>]*>/g, ''));
}

// View feedback
function viewFeedback(assignmentId) {
  const classItem = enrolledClasses.find(c => c.id === currentClassId);
  if (!classItem) return;
  
  const assignment = classItem.assignments.find(a => a.id === assignmentId);
  if (!assignment) return;
  
  const submission = assignment.submissions.find(s => s.studentId === 'current-student-id');
  if (!submission || !submission.feedback) return;
  
  alert(`Feedback from Professor:\n\n${submission.feedback}`);
}

// Load class grades
function loadClassGrades() {
  const classItem = enrolledClasses.find(c => c.id === currentClassId);
  const gradesContainer = document.getElementById('grades-container');
  
  if (!classItem || !gradesContainer) return;
  
  gradesContainer.innerHTML = '';
  
  if (!classItem.assignments || classItem.assignments.length === 0) {
    gradesContainer.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-chart-line"></i>
        <h3>No Grades Available</h3>
        <p>Grades will appear here once assignments are graded</p>
      </div>
    `;
    return;
  }
  
  let gradesHTML = `
    <div class="grades-table">
      <table>
        <thead>
          <tr>
            <th>Assignment</th>
            <th>Due Date</th>
            <th>Points</th>
            <th>Your Grade</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
  `;
  
  let totalEarned = 0;
  let totalPossible = 0;
  let gradedCount = 0;
  
  classItem.assignments.forEach(assignment => {
    const submission = assignment.submissions ? 
      assignment.submissions.find(s => s.studentId === 'current-student-id') : null;
    
    const isSubmitted = !!submission;
    const isGraded = isSubmitted && submission.grade !== undefined;
    
    if (isGraded) {
      totalEarned += submission.grade;
      totalPossible += assignment.points;
      gradedCount++;
    }
    
    gradesHTML += `
      <tr>
        <td>${assignment.title}</td>
        <td>${new Date(assignment.dueDate).toLocaleDateString()}</td>
        <td>${assignment.points}</td>
        <td>${isGraded ? `${submission.grade}/${assignment.points}` : '-'}</td>
        <td class="status ${isGraded ? 'graded' : isSubmitted ? 'submitted' : 'pending'}">
          ${isGraded ? 'Graded' : isSubmitted ? 'Submitted' : 'Not Submitted'}
        </td>
      </tr>
    `;
  });
  
  gradesHTML += `
        </tbody>
      </table>
    </div>
  `;
  
  // Add class average if there are graded assignments
  if (gradedCount > 0) {
    const classAverage = (totalEarned / totalPossible * 100).toFixed(2);
    gradesHTML = `
      <div class="class-average">
        <h4>Class Average: ${classAverage}%</h4>
        <p>${gradedCount} assignment(s) graded</p>
      </div>
    ` + gradesHTML;
  }
  
  gradesContainer.innerHTML = gradesHTML;
}

// Load all assignments for assignments section
function loadAllAssignments() {
  const assignmentsList = document.getElementById('assignments-list');
  const filter = document.getElementById('assignment-filter').value;
  
  assignmentsList.innerHTML = '';
  
  let allAssignments = [];
  
  // Collect all assignments from all classes
  enrolledClasses.forEach(classItem => {
    if (classItem.assignments) {
      classItem.assignments.forEach(assignment => {
        const submission = assignment.submissions ? 
          assignment.submissions.find(s => s.studentId === 'current-student-id') : null;
        
        allAssignments.push({
          ...assignment,
          className: classItem.name,
          classId: classItem.id,
          isSubmitted: !!submission,
          isGraded: !!submission && submission.grade !== undefined,
          isOverdue: new Date(assignment.dueDate) < new Date() && !submission,
          submission: submission
        });
      });
    }
  });
  
  // Apply filter
  if (filter === 'pending') {
    allAssignments = allAssignments.filter(a => !a.isSubmitted && !a.isOverdue);
  } else if (filter === 'submitted') {
    allAssignments = allAssignments.filter(a => a.isSubmitted && !a.isGraded);
  } else if (filter === 'graded') {
    allAssignments = allAssignments.filter(a => a.isGraded);
  }
  
  // Sort by due date
  allAssignments.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
  
  if (allAssignments.length === 0) {
    assignmentsList.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-tasks"></i>
        <h3>No Assignments</h3>
        <p>${filter !== 'all' ? `No ${filter} assignments` : 'No assignments found'}</p>
      </div>
    `;
    return;
  }
  
  allAssignments.forEach(assignment => {
    const assignmentElement = document.createElement('div');
    assignmentElement.className = `assignment-item ${assignment.isOverdue ? 'overdue' : ''} ${assignment.isGraded ? 'graded' : ''}`;
    assignmentElement.innerHTML = `
      <div class="assignment-info">
        <h4>${assignment.title}</h4>
        <p class="class-name">${assignment.className}</p>
        <p class="assignment-description">${assignment.description}</p>
        <div class="assignment-meta">
          <span class="due-date ${assignment.isOverdue ? 'overdue' : ''}">
            <i class="fas fa-clock"></i> Due: ${new Date(assignment.dueDate).toLocaleDateString()}
            ${assignment.isOverdue ? ' (Overdue)' : ''}
          </span>
          <span class="points"><i class="fas fa-file-alt"></i> ${assignment.points} Points</span>
        </div>
      </div>
      <div class="assignment-status">
        <span class="status ${assignment.isGraded ? 'graded' : assignment.isSubmitted ? 'submitted' : 'pending'}">
          ${assignment.isGraded ? 'Graded' : assignment.isSubmitted ? 'Submitted' : 'Not Submitted'}
        </span>
        ${assignment.isGraded ? `
          <span class="grade">${assignment.submission.grade}/${assignment.points}</span>
        ` : ''}
        <div class="assignment-actions">
          ${!assignment.isSubmitted ? `
            <button class="btn-primary" onclick="openClass('${assignment.classId}')">
              Submit
            </button>
          ` : `
            <button class="btn-secondary" onclick="openClass('${assignment.classId}')">
              View
            </button>
          `}
        </div>
      </div>
    `;
    assignmentsList.appendChild(assignmentElement);
  });
}

// Filter assignments
function filterAssignments(filter) {
  loadAllAssignments();
}

// Load grades for grades section
function loadAllGrades() {
  const gradesDetails = document.getElementById('grades-details');
  const filter = document.getElementById('grade-filter').value;
  
  gradesDetails.innerHTML = '';
  
  let allGrades = [];
  let totalEarned = 0;
  let totalPossible = 0;
  let gradedCount = 0;
  
  // Collect grades from all classes
  enrolledClasses.forEach(classItem => {
    if (classItem.assignments) {
      let classEarned = 0;
      let classPossible = 0;
      let classGradedCount = 0;
      
      classItem.assignments.forEach(assignment => {
        const submission = assignment.submissions ? 
          assignment.submissions.find(s => s.studentId === 'current-student-id') : null;
        
        if (submission && submission.grade !== undefined) {
          classEarned += submission.grade;
          classPossible += assignment.points;
          classGradedCount++;
          
          totalEarned += submission.grade;
          totalPossible += assignment.points;
          gradedCount++;
        }
      });
      
      if (classGradedCount > 0) {
        const classAverage = (classEarned / classPossible * 100).toFixed(2);
        
        allGrades.push({
          className: classItem.name,
          classId: classItem.id,
          average: classAverage,
          gradedCount: classGradedCount,
          totalAssignments: classItem.assignments.length
        });
      }
    }
  });
  
  // Apply filter
  if (filter !== 'all') {
    allGrades = allGrades.filter(grade => grade.classId === filter);
  }
  
  // Update overall stats
  const overallAverage = gradedCount > 0 ? (totalEarned / totalPossible * 100).toFixed(2) : '0.00';
  document.getElementById('overall-grade').textContent = overallAverage;
  document.getElementById('completed-assignments-count').textContent = gradedCount;
  
  // Calculate pending assignments
  let pendingCount = 0;
  enrolledClasses.forEach(classItem => {
    if (classItem.assignments) {
      classItem.assignments.forEach(assignment => {
        const submission = assignment.submissions ? 
          assignment.submissions.find(s => s.studentId === 'current-student-id') : null;
        
        if (!submission && new Date(assignment.dueDate) > new Date()) {
          pendingCount++;
        }
      });
    }
  });
  document.getElementById('pending-assignments-count').textContent = pendingCount;
  
  if (allGrades.length === 0) {
    gradesDetails.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-chart-line"></i>
        <h3>No Grades Available</h3>
        <p>Grades will appear here once assignments are graded</p>
      </div>
    `;
    return;
  }
  
  allGrades.forEach(grade => {
    const gradeElement = document.createElement('div');
    gradeElement.className = 'grade-item';
    gradeElement.innerHTML = `
      <div class="grade-class-info">
        <h4>${grade.className}</h4>
        <p>${grade.gradedCount}/${grade.totalAssignments} assignments graded</p>
      </div>
      <div class="grade-average">
        <span class="average-score">${grade.average}%</span>
      </div>
      <button class="btn-outline" onclick="openClass('${grade.classId}')">
        View Details
      </button>
    `;
    gradesDetails.appendChild(gradeElement);
  });
}

// Filter grades
function filterGrades(classId) {
  loadAllGrades();
}

// Update grade filter options
function updateGradeFilter() {
  const gradeFilter = document.getElementById('grade-filter');
  gradeFilter.innerHTML = '<option value="all">All Classes</option>';
  
  enrolledClasses.forEach(classItem => {
    const option = document.createElement('option');
    option.value = classItem.id;
    option.textContent = classItem.name;
    gradeFilter.appendChild(option);
  });
}

// Download file
function downloadFile(filename, content) {
  const blob = base64ToBlob(content);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Convert base64 to Blob
function base64ToBlob(base64) {
  const parts = base64.split(';base64,');
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
    
    // Get first day of month and total days
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    // Add empty cells for days before first day of month
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
      if (hasEventOnDate(dateKey)) {
        dayElement.classList.add('has-event');
      }
      
      dayElement.addEventListener('click', () => showEventsForDate(year, month, day));
      calendarDays.appendChild(dayElement);
    }
  }
  
  function hasEventOnDate(dateKey) {
    // Check for assignment deadlines on this date
    for (const classItem of enrolledClasses) {
      if (classItem.assignments) {
        for (const assignment of classItem.assignments) {
          const dueDate = new Date(assignment.dueDate);
          const assignmentDateKey = `${dueDate.getFullYear()}-${dueDate.getMonth() + 1}-${dueDate.getDate()}`;
          if (assignmentDateKey === dateKey) {
            return true;
          }
        }
      }
    }
    return false;
  }
  
  function showEventsForDate(year, month, day) {
    const selectedDate = document.getElementById('selected-date');
    const eventList = document.getElementById('event-list');
    
    const date = new Date(year, month, day);
    selectedDate.textContent = date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    
    // Find assignments due on this date
    const events = [];
    enrolledClasses.forEach(classItem => {
      if (classItem.assignments) {
        classItem.assignments.forEach(assignment => {
          const dueDate = new Date(assignment.dueDate);
          if (dueDate.getFullYear() === year && 
              dueDate.getMonth() === month && 
              dueDate.getDate() === day) {
            events.push(`Assignment: ${assignment.title} (${classItem.name})`);
          }
        });
      }
    });
    
    eventList.innerHTML = '';
    if (events.length === 0) {
      eventList.innerHTML = '<li>No events or deadlines for this day</li>';
    } else {
      events.forEach(event => {
        const li = document.createElement('li');
        li.textContent = event;
        eventList.appendChild(li);
      });
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

// Update dashboard statistics
async function updateDashboardStats() {
  try {
    const response = await fetch('/api/student/stats');
    if (response.ok) {
      const stats = await response.json();
      
      document.getElementById('enrolled-classes-count').textContent = stats.enrolled_classes;
      document.getElementById('pending-assignments').textContent = stats.pending_assignments;
      document.getElementById('upcoming-deadlines').textContent = stats.upcoming_deadlines;
      document.getElementById('completed-assignments').textContent = stats.completed_assignments;
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
  
  // Update recent activity
  updateRecentActivity();
}

// Calculate dashboard stats from enrolled classes
function calculateDashboardStats() {
  const enrolledClassesCount = enrolledClasses.length;
  let pendingAssignments = 0;
  let upcomingDeadlines = 0;
  let completedAssignments = 0;
  
  enrolledClasses.forEach(classItem => {
    if (classItem.assignments) {
      classItem.assignments.forEach(assignment => {
        const submission = assignment.submissions ? 
          assignment.submissions.find(s => s.studentId === 'current-student-id') : null;
        
        if (submission) {
          completedAssignments++;
        } else {
          pendingAssignments++;
        }
        
        const dueDate = new Date(assignment.dueDate);
        const today = new Date();
        const daysUntilDue = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
        
        if (daysUntilDue >= 0 && daysUntilDue <= 7) {
          upcomingDeadlines++;
        }
      });
    }
  });
  
  document.getElementById('enrolled-classes-count').textContent = enrolledClassesCount;
  document.getElementById('pending-assignments').textContent = pendingAssignments;
  document.getElementById('upcoming-deadlines').textContent = upcomingDeadlines;
  document.getElementById('completed-assignments').textContent = completedAssignments;
}

// Update deadline list
function updateDeadlineList() {
  const deadlineList = document.getElementById('deadline-list');
  deadlineList.innerHTML = '';
  
  let allDeadlines = [];
  
  enrolledClasses.forEach(classItem => {
    if (classItem.assignments) {
      classItem.assignments.forEach(assignment => {
        const submission = assignment.submissions ? 
          assignment.submissions.find(s => s.studentId === 'current-student-id') : null;
        
        if (!submission) {
          allDeadlines.push({
            title: assignment.title,
            class: classItem.name,
            dueDate: new Date(assignment.dueDate),
            classId: classItem.id
          });
        }
      });
    }
  });
  
  // Sort by due date
  allDeadlines.sort((a, b) => a.dueDate - b.dueDate);
  
  // Take only next 5 deadlines
  allDeadlines = allDeadlines.slice(0, 5);
  
  if (allDeadlines.length === 0) {
    deadlineList.innerHTML = '<li>No upcoming deadlines</li>';
    return;
  }
  
  allDeadlines.forEach(deadline => {
    const li = document.createElement('li');
    li.innerHTML = `
      <span class="deadline-title">${deadline.title}</span>
      <span class="deadline-class">${deadline.class}</span>
      <span class="deadline-date">${deadline.dueDate.toLocaleDateString()}</span>
      <button class="btn-small" onclick="openClass('${deadline.classId}')">View</button>
    `;
    deadlineList.appendChild(li);
  });
}

// Update recent activity
function updateRecentActivity() {
  const activityList = document.getElementById('activity-list');
  activityList.innerHTML = '';
  
  let allActivities = [];
  
  enrolledClasses.forEach(classItem => {
    // Add class enrollment as activity
    allActivities.push({
      type: 'enrollment',
      class: classItem.name,
      date: new Date(classItem.enrollmentDate || new Date()),
      classId: classItem.id
    });
    
    // Add assignment submissions as activities
    if (classItem.assignments) {
      classItem.assignments.forEach(assignment => {
        const submission = assignment.submissions ? 
          assignment.submissions.find(s => s.studentId === 'current-student-id') : null;
        
        if (submission) {
          allActivities.push({
            type: 'submission',
            class: classItem.name,
            assignment: assignment.title,
            date: new Date(submission.date),
            classId: classItem.id
          });
        }
        
        // Add assignment creation as activity (for demo)
        allActivities.push({
          type: 'assignment_created',
          class: classItem.name,
          assignment: assignment.title,
          date: new Date(assignment.createdDate || new Date()),
          classId: classItem.id
        });
      });
    }
    
    // Add materials as activities
    if (classItem.materials) {
      classItem.materials.forEach(material => {
        allActivities.push({
          type: 'material',
          class: classItem.name,
          material: material.title,
          date: new Date(material.date),
          classId: classItem.id
        });
      });
    }
  });
  
  // Sort by date (newest first)
  allActivities.sort((a, b) => b.date - a.date);
  
  // Take only recent 10 activities
  allActivities = allActivities.slice(0, 10);
  
  if (allActivities.length === 0) {
    activityList.innerHTML = '<li>No recent activity</li>';
    return;
  }
  
  allActivities.forEach(activity => {
    const li = document.createElement('li');
    
    let activityText = '';
    let icon = '';
    
    switch (activity.type) {
      case 'enrollment':
        activityText = `Enrolled in ${activity.class}`;
        icon = 'fas fa-user-plus';
        break;
      case 'submission':
        activityText = `Submitted "${activity.assignment}" in ${activity.class}`;
        icon = 'fas fa-paper-plane';
        break;
      case 'assignment_created':
        activityText = `New assignment "${activity.assignment}" in ${activity.class}`;
        icon = 'fas fa-tasks';
        break;
      case 'material':
        activityText = `New material "${activity.material}" in ${activity.class}`;
        icon = 'fas fa-file-upload';
        break;
    }
    
    li.innerHTML = `
      <i class="${icon}"></i>
      <div class="activity-content">
        <span class="activity-text">${activityText}</span>
        <span class="activity-date">${activity.date.toLocaleDateString()}</span>
      </div>
      <button class="btn-small" onclick="openClass('${activity.classId}')">View</button>
    `;
    activityList.appendChild(li);
  });
}

// Save enrolled classes to localStorage (for demo)
function saveEnrolledClasses() {
  localStorage.setItem('enrolledClasses', JSON.stringify(enrolledClasses));
}

// Load enrolled classes from localStorage (for demo)
function loadEnrolledClassesFromStorage() {
  const saved = localStorage.getItem('enrolledClasses');
  if (saved) {
    enrolledClasses = JSON.parse(saved);
  }
}

// Initialize with sample data if none exists
function initializeSampleData() {
  if (enrolledClasses.length === 0) {
    enrolledClasses = [
      {
        id: 'class1',
        name: 'Introduction to Computer Science',
        code: 'CS101',
        description: 'Fundamental concepts of computer science and programming',
        professor_name: 'Dr. Smith',
        materials: [
          {
            title: 'Syllabus',
            description: 'Course syllabus and grading policy',
            date: '2024-01-15',
            files: []
          }
        ],
        assignments: [
          {
            id: 'assign1',
            title: 'Programming Assignment 1',
            description: 'Basic programming concepts',
            points: 100,
            dueDate: '2024-02-15',
            instructions: 'Complete the exercises in the textbook',
            submissions: []
          }
        ]
      }
    ];
    saveEnrolledClasses();
  }
}

// Initialize the application
function init() {
  loadEnrolledClassesFromStorage();
  initializeSampleData();
  renderClassList();
  updateDashboardStats();
  loadAllAssignments();
  loadAllGrades();
}

// Call init when DOM is loaded
document.addEventListener('DOMContentLoaded', init);