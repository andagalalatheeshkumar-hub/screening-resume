// State management
let state = {
    jobs: [],
    applicants: [],
    stats: {},
    selectedFile: null,
    selectedModalFile: null,
    activeTab: 'dashboard',
    draggedApplicantId: null
};

// API Base Endpoints
const API_JOBS = '/api/jobs';
const API_APPLICANTS = '/api/applicants';

// DOM Elements
document.addEventListener('DOMContentLoaded', () => {
    initApp();
    setupEventListeners();
});

// Initialize Application
async function initApp() {
    // Initialize Lucide Icons
    lucide.createIcons();
    
    // Load initial data
    await refreshData();

    // Check for hash redirect
    const hash = window.location.hash.substring(1);
    if (hash && ['dashboard', 'screen', 'pipeline', 'jobs'].includes(hash)) {
        switchTab(hash);
    } else {
        switchTab('dashboard');
    }
}

// Refresh Jobs and Applicants from Database
async function refreshData() {
    try {
        const [jobsResponse, applicantsResponse, statsResponse] = await Promise.all([
            fetch(API_JOBS),
            fetch(API_APPLICANTS),
            fetch(`${API_APPLICANTS}/stats`)
        ]);

        state.jobs = await jobsResponse.json();
        state.applicants = await applicantsResponse.json();
        state.stats = await statsResponse.json();

        // Update UI Components
        updateDashboardUI();
        updateDropdowns();
        populateJobsList();
        populatePipeline();
    } catch (error) {
        showToast('Error fetching data from server.', 'error');
        console.error(error);
    }
}

// Setup Event Listeners
function setupEventListeners() {
    // Mobile Navigation Toggle
    const mobileToggle = document.getElementById('mobile-toggle');
    const sidebar = document.getElementById('sidebar');
    
    if (mobileToggle && sidebar) {
        mobileToggle.addEventListener('click', () => {
            sidebar.classList.toggle('active');
        });
        
        // Close sidebar on item click (mobile)
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', () => {
                if (window.innerWidth <= 768) {
                    sidebar.classList.remove('active');
                }
            });
        });
    }

    // Drop Zone Setup (Screen Tab)
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('resume-file-input');

    if (dropZone && fileInput) {
        dropZone.addEventListener('click', () => fileInput.click());
        
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                handleFileSelection(e.target.files[0], 'normal');
            }
        });

        ['dragenter', 'dragover'].forEach(eventName => {
            dropZone.addEventListener(eventName, (e) => {
                e.preventDefault();
                dropZone.classList.add('dragover');
            }, false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, (e) => {
                e.preventDefault();
                dropZone.classList.remove('dragover');
            }, false);
        });

        dropZone.addEventListener('drop', (e) => {
            const dt = e.dataTransfer;
            const files = dt.files;
            if (files.length > 0) {
                fileInput.files = files; // Sync file input
                handleFileSelection(files[0], 'normal');
            }
        });
    }

    // Modal Drop Zone Setup
    const modalDropZone = document.getElementById('modal-drop-zone');
    const modalFileInput = document.getElementById('modal-file-input');

    if (modalDropZone && modalFileInput) {
        modalDropZone.addEventListener('click', () => modalFileInput.click());
        
        modalFileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                handleFileSelection(e.target.files[0], 'modal');
            }
        });

        ['dragenter', 'dragover'].forEach(eventName => {
            modalDropZone.addEventListener(eventName, (e) => {
                e.preventDefault();
                modalDropZone.classList.add('dragover');
            }, false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            modalDropZone.addEventListener(eventName, (e) => {
                e.preventDefault();
                modalDropZone.classList.remove('dragover');
            }, false);
        });

        modalDropZone.addEventListener('drop', (e) => {
            const dt = e.dataTransfer;
            const files = dt.files;
            if (files.length > 0) {
                modalFileInput.files = files;
                handleFileSelection(files[0], 'modal');
            }
        });
    }
}

// Tab Switching Routing
function switchTab(tabId) {
    state.activeTab = tabId;
    window.location.hash = tabId;

    // Toggle Tab Content
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    const activeTabEl = document.getElementById(`${tabId}-tab`);
    if (activeTabEl) activeTabEl.classList.add('active');

    // Toggle Navigation Items
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.getAttribute('href') === `#${tabId}`) {
            item.classList.add('active');
        }
    });

    // Update Page Header Titles
    const pageTitle = document.getElementById('page-title');
    const pageSubtitle = document.getElementById('page-subtitle');
    
    switch (tabId) {
        case 'dashboard':
            pageTitle.innerText = "Recruitment Dashboard";
            pageSubtitle.innerText = "Welcome back! Here is your recruitment overview.";
            break;
        case 'screen':
            pageTitle.innerText = "Resume Screening Tool";
            pageSubtitle.innerText = "Evaluate candidates and extract keyword matching metrics.";
            break;
        case 'pipeline':
            pageTitle.innerText = "ATS Pipeline Board";
            pageSubtitle.innerText = "Manage applicant status, drag-and-drop through hiring stages.";
            break;
        case 'jobs':
            pageTitle.innerText = "Job Postings";
            pageSubtitle.innerText = "Publish and manage active roles for resume screening.";
            break;
    }
}

// Toast Notifications Helper
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let iconName = 'info';
    if (type === 'success') iconName = 'check-circle-2';
    if (type === 'error') iconName = 'x-circle';

    toast.innerHTML = `
        <i data-lucide="${iconName}"></i>
        <span>${message}</span>
    `;
    
    container.appendChild(toast);
    lucide.createIcons();

    // Auto-remove toast after 4 seconds
    setTimeout(() => {
        toast.style.animation = 'fadeOut 0.3s ease forwards';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// File Selection Handler
function handleFileSelection(file, targetType) {
    const allowedExtensions = ['.pdf', '.docx', '.txt'];
    const filename = file.name;
    const fileExtension = filename.substring(filename.lastIndexOf('.')).toLowerCase();

    if (!allowedExtensions.includes(fileExtension)) {
        showToast('Invalid format. Please select a PDF, DOCX, or TXT file.', 'error');
        removeSelectedFile(targetType);
        return;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
        showToast('File is too large. Max allowed size is 10MB.', 'error');
        removeSelectedFile(targetType);
        return;
    }

    if (targetType === 'normal') {
        state.selectedFile = file;
        document.getElementById('selected-file-details').classList.remove('hidden');
        document.getElementById('file-name-span').innerText = `${file.name} (${formatBytes(file.size)})`;
        document.getElementById('drop-zone').classList.add('hidden');
    } else {
        state.selectedModalFile = file;
        document.getElementById('modal-file-details').classList.remove('hidden');
        document.getElementById('modal-file-name-span').innerText = `${file.name} (${formatBytes(file.size)})`;
        document.getElementById('modal-drop-zone').classList.add('hidden');
    }
}

// Remove File selection
function removeSelectedFile(targetType = 'normal') {
    if (targetType === 'normal') {
        state.selectedFile = null;
        document.getElementById('resume-file-input').value = '';
        document.getElementById('selected-file-details').classList.add('hidden');
        document.getElementById('drop-zone').classList.remove('hidden');
    } else {
        state.selectedModalFile = null;
        document.getElementById('modal-file-input').value = '';
        document.getElementById('modal-file-details').classList.add('hidden');
        document.getElementById('modal-drop-zone').classList.remove('hidden');
    }
}

// Format Bytes
function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// Update Dashboard Statistics
function updateDashboardUI() {
    document.getElementById('stat-total-applicants').innerText = state.stats.totalApplicants || 0;
    document.getElementById('stat-average-score').innerText = (state.stats.averageScore || 0) + '%';
    document.getElementById('stat-active-jobs').innerText = state.stats.jobCount || 0;

    // Funnel stages progress calculation
    const total = state.stats.totalApplicants || 1;
    const stages = ['applied', 'screening', 'interview', 'offered', 'rejected'];

    stages.forEach(stage => {
        const count = state.stats[stage] || 0;
        const pct = total > 0 ? (count / total) * 100 : 0;
        
        document.getElementById(`count-${stage}`).innerText = count;
        document.getElementById(`bar-${stage}`).style.width = `${pct}%`;
    });

    // Populate Recent Applicants Table
    const recentList = document.getElementById('recent-applicants-list');
    recentList.innerHTML = '';

    if (state.applicants.length === 0) {
        recentList.innerHTML = `<tr><td colspan="5" class="text-center text-muted">No applicants found.</td></tr>`;
        return;
    }

    // Sort by applied date desc and pick first 5
    const recent = [...state.applicants]
        .sort((a, b) => new Date(b.appliedDate) - new Date(a.appliedDate))
        .slice(0, 5);

    recent.forEach(app => {
        const tr = document.createElement('tr');
        tr.style.cursor = 'pointer';
        tr.onclick = () => viewCandidateProfile(app.id);
        tr.innerHTML = `
            <td><strong>${escapeHTML(app.name)}</strong></td>
            <td>${escapeHTML(app.jobTitle)}</td>
            <td>
                <span class="badge ${getScoreClass(app.score)}">${app.score}%</span>
            </td>
            <td><span class="badge badge-${app.status.toLowerCase()}">${capitalize(app.status)}</span></td>
            <td>${formatDate(app.appliedDate)}</td>
        `;
        recentList.appendChild(tr);
    });
}

// Update select dropdowns across application tabs
function updateDropdowns() {
    const jobSelect = document.getElementById('screen-job-select');
    const filterSelect = document.getElementById('pipeline-job-filter');
    const modalSelect = document.getElementById('modal-job-select');

    // Cache current selections
    const selectedJob = jobSelect.value;
    const selectedFilter = filterSelect.value;
    const selectedModal = modalSelect.value;

    // Reset lists
    jobSelect.innerHTML = '<option value="" disabled selected>Select a Job Role...</option>';
    filterSelect.innerHTML = '<option value="all">All Jobs</option>';
    modalSelect.innerHTML = '<option value="" disabled selected>Select a Job Role...</option>';

    state.jobs.forEach(job => {
        const optionHTML = `<option value="${job.id}">${escapeHTML(job.title)} (${escapeHTML(job.department)})</option>`;
        jobSelect.insertAdjacentHTML('beforeend', optionHTML);
        filterSelect.insertAdjacentHTML('beforeend', optionHTML);
        modalSelect.insertAdjacentHTML('beforeend', optionHTML);
    });

    // Restore selections
    if (selectedJob && state.jobs.some(j => j.id == selectedJob)) jobSelect.value = selectedJob;
    if (selectedFilter && (selectedFilter === 'all' || state.jobs.some(j => j.id == selectedFilter))) filterSelect.value = selectedFilter;
    if (selectedModal && state.jobs.some(j => j.id == selectedModal)) modalSelect.value = selectedModal;
}

// Populate Job Postings Board Tab
function populateJobsList() {
    const container = document.getElementById('jobs-list');
    container.innerHTML = '';

    if (state.jobs.length === 0) {
        container.innerHTML = `<div class="glass text-center text-muted" style="padding: 40px;">No job postings available. Create one to start screening.</div>`;
        return;
    }

    state.jobs.forEach(job => {
        const card = document.createElement('div');
        card.className = 'job-card glass';
        card.innerHTML = `
            <div class="job-card-header">
                <div class="job-card-title">${escapeHTML(job.title)}</div>
                <button class="btn-remove job-card-actions" onclick="deleteJob(${job.id}, event)" title="Delete Posting">
                    <i data-lucide="trash-2"></i>
                </button>
            </div>
            <div class="job-card-meta">
                <span><i data-lucide="folder"></i> ${escapeHTML(job.department)}</span>
                <span><i data-lucide="map-pin"></i> ${escapeHTML(job.location)}</span>
                <span><i data-lucide="calendar"></i> ${formatDate(job.createdDate)}</span>
            </div>
            <div class="job-card-desc">${escapeHTML(job.description)}</div>
        `;
        container.appendChild(card);
    });
    lucide.createIcons();
}

// Handle job creation
async function handleCreateJob(event) {
    event.preventDefault();
    
    const title = document.getElementById('job-title-input').value;
    const department = document.getElementById('job-dept-input').value;
    const location = document.getElementById('job-loc-input').value;
    const description = document.getElementById('job-desc-input').value;
    const requirements = document.getElementById('job-req-input').value;

    const payload = { title, department, location, description, requirements };

    try {
        const response = await fetch(API_JOBS, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            showToast('Job posting created successfully!', 'success');
            document.getElementById('create-job-form').reset();
            await refreshData();
        } else {
            showToast('Failed to create job posting.', 'error');
        }
    } catch (error) {
        showToast('Server communication error.', 'error');
        console.error(error);
    }
}

// Handle job deletion
async function deleteJob(jobId, event) {
    if (event) event.stopPropagation();
    if (!confirm('Are you sure you want to delete this job posting? All candidate associations will remain in historical logs but won\'t map to this role.')) {
        return;
    }

    try {
        const response = await fetch(`${API_JOBS}/${jobId}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            showToast('Job posting deleted.', 'success');
            await refreshData();
        } else {
            showToast('Could not delete job posting.', 'error');
        }
    } catch (error) {
        showToast('Server communication error.', 'error');
        console.error(error);
    }
}

// Handle screen submit
async function handleScreeningSubmit(event) {
    event.preventDefault();
    
    const jobId = document.getElementById('screen-job-select').value;
    if (!jobId) {
        showToast('Please select a target job role.', 'error');
        return;
    }

    if (!state.selectedFile) {
        showToast('Please upload a resume file.', 'error');
        return;
    }

    await screenCandidate(state.selectedFile, jobId, 'normal');
}

// Trigger screening from the header modal
async function triggerModalScreening() {
    const jobId = document.getElementById('modal-job-select').value;
    if (!jobId) {
        showToast('Please select a target job role.', 'error');
        return;
    }

    if (!state.selectedModalFile) {
        showToast('Please upload a resume file.', 'error');
        return;
    }

    await screenCandidate(state.selectedModalFile, jobId, 'modal');
    closeScreenModal();
}

// Core API Screening call
async function screenCandidate(file, jobId, type) {
    const btn = type === 'normal' 
        ? document.getElementById('btn-submit-screen') 
        : document.querySelector('#screen-modal button.btn-block');
        
    const originalText = btn.innerHTML;
    
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner"></span> Analyzing...`;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('jobId', jobId);

    try {
        const response = await fetch(`${API_APPLICANTS}/screen`, {
            method: 'POST',
            body: formData
        });

        const result = await response.json();
        
        if (response.ok) {
            showToast('Screening completed in less than a second!', 'success');
            
            // If screened in the main screen tab, render results directly
            if (type === 'normal') {
                renderScreeningResult(result);
            } else {
                // If via modal, redirect to screen tab and render there
                switchTab('screen');
                // Set form selections so they match the result
                document.getElementById('screen-job-select').value = jobId;
                // Cache file representation
                handleFileSelection(file, 'normal');
                renderScreeningResult(result);
            }
            
            removeSelectedFile(type);
            await refreshData();
        } else {
            showToast(result.error || 'Failed to screen resume.', 'error');
        }
    } catch (error) {
        showToast('Communication error during processing.', 'error');
        console.error(error);
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}

// Render screening results drawer
function renderScreeningResult(applicant) {
    const container = document.getElementById('screening-results');
    container.classList.remove('empty-state');
    
    const content = document.getElementById('results-content');
    content.classList.remove('hidden');
    
    // Set text elements
    document.getElementById('result-name').innerText = applicant.name;
    document.getElementById('result-email').innerHTML = `<i data-lucide="mail" style="width:14px;height:14px"></i> ${applicant.email}`;
    document.getElementById('result-phone').innerHTML = `<i data-lucide="phone" style="width:14px;height:14px"></i> ${applicant.phone}`;
    
    // Score ring percentage animation
    const score = applicant.score;
    const scoreRing = document.getElementById('score-ring-fill');
    const scoreText = document.getElementById('result-score');
    
    scoreText.innerText = `${score}%`;
    
    // Set circle offset. Circumference = 263.89
    const circumference = 2 * Math.PI * 42;
    const offset = circumference - (score / 100) * circumference;
    scoreRing.style.strokeDashoffset = offset;
    
    // Change fill color dynamically based on score
    let strokeColor = '#ef4444'; // Red
    if (score >= 80) strokeColor = '#10b981'; // Green
    else if (score >= 50) strokeColor = '#f59e0b'; // Orange
    scoreRing.style.stroke = strokeColor;

    // Matched skills tags
    const matchedContainer = document.getElementById('result-matched-skills');
    matchedContainer.innerHTML = '';
    if (applicant.matchedSkills && applicant.matchedSkills.trim()) {
        applicant.matchedSkills.split(',').forEach(skill => {
            matchedContainer.insertAdjacentHTML('beforeend', `<span class="skill-tag">${escapeHTML(skill.trim())}</span>`);
        });
    } else {
        matchedContainer.innerHTML = '<span class="text-muted text-xs">No matching skills found.</span>';
    }

    // Missing skills tags
    const missingContainer = document.getElementById('result-missing-skills');
    missingContainer.innerHTML = '';
    if (applicant.missingSkills && applicant.missingSkills.trim()) {
        applicant.missingSkills.split(',').forEach(skill => {
            missingContainer.insertAdjacentHTML('beforeend', `<span class="skill-tag">${escapeHTML(skill.trim())}</span>`);
        });
    } else {
        missingContainer.innerHTML = '<span class="text-muted text-xs">No missing skills detected.</span>';
    }

    // Feedback paragraph
    const feedbackBox = document.getElementById('result-feedback');
    feedbackBox.innerHTML = formatMarkdown(applicant.feedback);
    
    lucide.createIcons();
}

// Populate Kanban Pipeline Board
function populatePipeline() {
    const filterJobId = document.getElementById('pipeline-job-filter').value;
    const columns = ['APPLIED', 'SCREENING', 'INTERVIEW', 'OFFERED', 'REJECTED'];
    
    // Reset columns HTML and count
    columns.forEach(col => {
        document.getElementById(`cards-${col.toLowerCase()}`).innerHTML = '';
        document.getElementById(`count-col-${col.toLowerCase()}`).innerText = '0';
    });

    const filtered = filterJobId === 'all' 
        ? state.applicants 
        : state.applicants.filter(app => app.jobId == filterJobId);

    // Group candidates
    const groups = {
        APPLIED: [],
        SCREENING: [],
        INTERVIEW: [],
        OFFERED: [],
        REJECTED: []
    };

    filtered.forEach(app => {
        if (groups[app.status]) {
            groups[app.status].push(app);
        } else {
            groups.APPLIED.push(app); // Safe default
        }
    });

    // Populate columns
    columns.forEach(status => {
        const colContainer = document.getElementById(`cards-${status.toLowerCase()}`);
        const countBadge = document.getElementById(`count-col-${status.toLowerCase()}`);
        const list = groups[status];

        countBadge.innerText = list.length;

        list.forEach(app => {
            const card = document.createElement('div');
            card.className = 'candidate-card';
            card.id = `candidate-card-${app.id}`;
            card.draggable = true;
            card.ondragstart = (e) => handleDragStart(e, app.id);
            card.onclick = () => viewCandidateProfile(app.id);
            
            let scoreClass = 'low';
            if (app.score >= 80) scoreClass = 'high';
            else if (app.score >= 50) scoreClass = 'medium';

            card.innerHTML = `
                <div class="card-header-row">
                    <span class="card-name" title="${escapeHTML(app.name)}">${escapeHTML(app.name)}</span>
                    <span class="card-score ${scoreClass}">${app.score}%</span>
                </div>
                <div class="card-role">${escapeHTML(app.jobTitle)}</div>
                <div class="card-footer">
                    <span>${formatDate(app.appliedDate)}</span>
                    <div class="card-actions">
                        <button onclick="deleteCandidate(${app.id}, event)" title="Delete Profile"><i data-lucide="trash-2" style="width:12px;height:12px"></i></button>
                    </div>
                </div>
            `;
            colContainer.appendChild(card);
        });
    });
    lucide.createIcons();
}

// Drag & Drop Handlers
function handleDragStart(event, applicantId) {
    state.draggedApplicantId = applicantId;
    event.dataTransfer.setData('text/plain', applicantId);
}

function allowDrop(event) {
    event.preventDefault();
}

async function handleDrop(event, targetStatus) {
    event.preventDefault();
    const applicantId = state.draggedApplicantId;
    if (!applicantId) return;

    // Find card and move it immediately on client side for responsive instant layout changes
    const applicant = state.applicants.find(a => a.id == applicantId);
    if (!applicant) return;

    const oldStatus = applicant.status;
    if (oldStatus === targetStatus) return; // No change

    // Trigger API update
    try {
        const response = await fetch(`${API_APPLICANTS}/${applicantId}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: targetStatus })
        });

        if (response.ok) {
            showToast(`${applicant.name} moved to ${capitalize(targetStatus)}`, 'success');
            await refreshData();
        } else {
            showToast('Failed to update candidate status.', 'error');
            populatePipeline(); // Revert UI
        }
    } catch (error) {
        showToast('Communication error.', 'error');
        console.error(error);
        populatePipeline(); // Revert UI
    } finally {
        state.draggedApplicantId = null;
    }
}

// Filter Kanban Pipeline
function filterPipeline() {
    populatePipeline();
}

// Delete Candidate
async function deleteCandidate(applicantId, event) {
    if (event) event.stopPropagation();
    if (!confirm('Are you sure you want to delete this applicant profile?')) {
        return;
    }

    try {
        const response = await fetch(`${API_APPLICANTS}/${applicantId}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            showToast('Candidate profile deleted.', 'success');
            await refreshData();
        } else {
            showToast('Could not delete candidate.', 'error');
        }
    } catch (error) {
        showToast('Server communication error.', 'error');
        console.error(error);
    }
}

// View Candidate Profile (Modal Detail)
function viewCandidateProfile(applicantId) {
    const applicant = state.applicants.find(a => a.id == applicantId);
    if (!applicant) return;

    const modal = document.getElementById('candidate-modal');
    const body = document.getElementById('candidate-modal-body');
    
    let scoreClass = 'low';
    if (applicant.score >= 80) scoreClass = 'high';
    else if (applicant.score >= 50) scoreClass = 'medium';

    body.innerHTML = `
        <div class="profile-section">
            <div class="profile-header-info">
                <div>
                    <h2 style="font-size:20px; font-weight:800">${escapeHTML(applicant.name)}</h2>
                    <p class="text-muted" style="font-size:13px">Applied for: <strong>${escapeHTML(applicant.jobTitle)}</strong> on ${formatDate(applicant.appliedDate)}</p>
                </div>
                <span class="badge ${scoreClass}" style="font-size:14px; padding:6px 12px">${applicant.score}% Match</span>
            </div>

            <div class="meta-badges" style="margin: 4px 0">
                <span class="badge" style="background:rgba(255,255,255,0.05); border:1px solid var(--border-color)">
                    <i data-lucide="mail" style="width:14px;height:14px"></i> ${escapeHTML(applicant.email)}
                </span>
                <span class="badge" style="background:rgba(255,255,255,0.05); border:1px solid var(--border-color)">
                    <i data-lucide="phone" style="width:14px;height:14px"></i> ${escapeHTML(applicant.phone)}
                </span>
                <span class="badge" style="background:rgba(255,255,255,0.05); border:1px solid var(--border-color)">
                    <i data-lucide="file" style="width:14px;height:14px"></i> ${escapeHTML(applicant.resumeFileName)}
                </span>
                <span class="badge badge-${applicant.status.toLowerCase()}">${capitalize(applicant.status)}</span>
            </div>

            <div class="form-group" style="margin-top:10px">
                <label>Change Status</label>
                <select class="form-control" onchange="updateCandidateStatus(${applicant.id}, this.value)">
                    <option value="APPLIED" ${applicant.status === 'APPLIED' ? 'selected' : ''}>Applied</option>
                    <option value="SCREENING" ${applicant.status === 'SCREENING' ? 'selected' : ''}>Screening</option>
                    <option value="INTERVIEW" ${applicant.status === 'INTERVIEW' ? 'selected' : ''}>Interviewing</option>
                    <option value="OFFERED" ${applicant.status === 'OFFERED' ? 'selected' : ''}>Offered</option>
                    <option value="REJECTED" ${applicant.status === 'REJECTED' ? 'selected' : ''}>Rejected</option>
                </select>
            </div>

            <div class="skills-analysis" style="margin-top:10px">
                <div class="skills-box match">
                    <h4>Matched Skills</h4>
                    <div class="skills-tags">
                        ${applicant.matchedSkills ? applicant.matchedSkills.split(',').map(s => `<span class="skill-tag">${escapeHTML(s.trim())}</span>`).join('') : '<span class="text-muted text-xs">None</span>'}
                    </div>
                </div>
                <div class="skills-box missing">
                    <h4>Missing Skills</h4>
                    <div class="skills-tags">
                        ${applicant.missingSkills ? applicant.missingSkills.split(',').map(s => `<span class="skill-tag">${escapeHTML(s.trim())}</span>`).join('') : '<span class="text-muted text-xs">None</span>'}
                    </div>
                </div>
            </div>

            <div class="feedback-box">
                <h4>Screening Report</h4>
                <div class="feedback-text">${formatMarkdown(applicant.feedback)}</div>
            </div>
        </div>
    `;

    modal.classList.add('active');
    lucide.createIcons();
}

// Update Candidate Status from Modal Dropdown
async function updateCandidateStatus(applicantId, newStatus) {
    try {
        const response = await fetch(`${API_APPLICANTS}/${applicantId}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus })
        });

        if (response.ok) {
            showToast(`Status updated successfully.`, 'success');
            await refreshData();
            // Re-render modal content
            viewCandidateProfile(applicantId);
        } else {
            showToast('Failed to update status.', 'error');
        }
    } catch (error) {
        showToast('Communication error.', 'error');
        console.error(error);
    }
}

// Close Candidate Modal
function closeCandidateModal() {
    document.getElementById('candidate-modal').classList.remove('active');
}

// Header Screening Modals
function openScreenModal() {
    document.getElementById('screen-modal').classList.add('active');
    updateDropdowns();
}

function closeScreenModal() {
    document.getElementById('screen-modal').classList.remove('active');
    removeSelectedFile('modal');
}

// Close modals when clicking outside
window.onclick = function(event) {
    const candModal = document.getElementById('candidate-modal');
    const scrModal = document.getElementById('screen-modal');
    if (event.target === candModal) closeCandidateModal();
    if (event.target === scrModal) closeScreenModal();
};

// Utilities Helpers
function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g, 
        tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
    );
}

function capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

function getScoreClass(score) {
    if (score >= 80) return 'badge-offered'; // Green
    if (score >= 50) return 'badge-screening'; // Orange
    return 'badge-rejected'; // Red
}

function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// Simple Markdown parsing for bullet points and bold formatting
function formatMarkdown(text) {
    if (!text) return '';
    let html = escapeHTML(text);
    
    // Replace strong tags (**text**)
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Replace markdown headers (### text)
    html = html.replace(/###\s+(.*?)\n/g, '<h5 style="margin-top:12px; margin-bottom:6px; font-weight:700; color:#fff">$1</h5>');
    
    // Convert newlines to paragraphs/breaks
    html = html.replace(/\n/g, '<br>');
    
    return html;
}
