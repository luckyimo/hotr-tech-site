const STORAGE_KEY = 'sound_team_review_board_v2';
const USERS_KEY = 'sound_team_review_users_v2';
const SESSION_KEY = 'sound_team_review_session_v2';

const skillQuestions = [
  {
    id: 1,
    question: 'When starting a live mix, what should happen before any channel is routed to the main bus?',
    choices: [
      'Turn all bus sends to unity gain.',
      'Set the gain structure and check the output level from the console with all channels at unity.',
      'Patch the recording feed into the monitor system.',
      'Mute each channel and leave the monitor returns open.'
    ],
    correct: 1
  },
  {
    id: 2,
    question: 'The best reason to use a high-pass filter on a vocal channel is to:',
    choices: [
      'Increase the amount of room echo.',
      'Reduce low-frequency rumble and make space for the fundamentals of the vocal.',
      'Boost the channel for the entire mix bus.',
      'Replace proper gain staging.'
    ],
    correct: 1
  },
  {
    id: 3,
    question: 'A good gain structure is best described as:',
    choices: [
      'All channels at maximum level before the mix bus.',
      'Increasing EQ to compensate for poor signal quality.',
      'Setting input gain so the signal is healthy and consistent without clipping, then shaping tone and dynamics afterwards.',
      'Keeping the monitor sends at full volume.'
    ],
    correct: 2
  },
  {
    id: 4,
    question: 'Which practice is most helpful when preparing a monitor mix for the worship team?',
    choices: [
      'Turn every monitor return to 100% and fix it later.',
      'Give each musician enough of their own voice and key instruments while keeping the overall mix clear and controlled.',
      'Only focus on the main house speakers.',
      'Leave all sends in the same position as the main mix.'
    ],
    correct: 1
  },
  {
    id: 5,
    question: 'When a channel is clipping even though the vocal sounds quiet, the next best step is to:',
    choices: [
      'Add more EQ and turn up the input gain.',
      'Check input trim, gain staging, and whether a post-fader send or plugin is overloading the channel.',
      'Switch to mono and ignore the issue.',
      'Mute the channel and continue the service.'
    ],
    correct: 1
  },
  {
    id: 6,
    question: 'Why is communication important during a live sound check?',
    choices: [
      'It lets the team coordinate levels, monitor changes, and troubleshooting without confusion during worship.',
      'It is only useful before the service starts.',
      'It replaces the need for patching and cable testing.',
      'It has no effect on the final mix.'
    ],
    correct: 0
  }
];

const defaultState = {
  volunteers: [],
  assessments: {}
};

let state = loadState();
let selectedVolunteerId = state.volunteers[0]?.id ?? 1;

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return JSON.parse(JSON.stringify(defaultState));
    }

    const parsed = JSON.parse(raw);
    if (!parsed.volunteers) {
      return JSON.parse(JSON.stringify(defaultState));
    }

    return parsed;
  } catch (error) {
    return JSON.parse(JSON.stringify(defaultState));
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function initials(name) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.add('visible');
  clearTimeout(showToast.timeoutId);
  showToast.timeoutId = setTimeout(() => {
    toast.classList.remove('visible');
  }, 2200);
}

function getVolunteerById(id) {
  return state.volunteers.find((volunteer) => volunteer.id === Number(id));
}

function getCurrentVolunteer() {
  return getVolunteerById(selectedVolunteerId) || state.volunteers[0];
}

function getStatusFromScore(score) {
  if (score >= 80) return 'Ready';
  if (score >= 70) return 'Developing';
  return 'Needs coaching';
}

function scoreAverage(values) {
  if (!values.length) return 0;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function rubricToPercent(score) {
  return Math.round((Number(score) / 5) * 100);
}

function updateVolunteerSelects() {
  const options = state.volunteers
    .map(
      (volunteer) =>
        `<option value="${volunteer.id}" ${volunteer.id === selectedVolunteerId ? 'selected' : ''}>${volunteer.name}</option>`
    )
    .join('');

  document.querySelectorAll('.volunteer-select').forEach((select) => {
    select.innerHTML = options;
  });
}

function renderOverview() {
  const total = state.volunteers.length;
  const ready = state.volunteers.filter((volunteer) => volunteer.status === 'Ready').length;
  const average = scoreAverage(state.volunteers.map((volunteer) => volunteer.examResult || 0));
  const needsCoaching = state.volunteers.filter((volunteer) => volunteer.status === 'Needs coaching').length;

  document.getElementById('total-volunteers').textContent = total;
  document.getElementById('ready-volunteers').textContent = ready;
  document.getElementById('average-score').textContent = `${average}%`;
  document.getElementById('needs-coaching').textContent = needsCoaching;

  const skillPriorityMap = [
    { label: 'Gain structure', value: scoreAverage(state.volunteers.map((volunteer) => state.assessments[volunteer.id]?.scores?.gain ? rubricToPercent(state.assessments[volunteer.id].scores.gain) : volunteer.examResult || 50)) },
    { label: 'Monitor mixing', value: scoreAverage(state.volunteers.map((volunteer) => state.assessments[volunteer.id]?.scores?.monitor ? rubricToPercent(state.assessments[volunteer.id].scores.monitor) : volunteer.examResult || 50)) },
    { label: 'EQ clarity', value: scoreAverage(state.volunteers.map((volunteer) => state.assessments[volunteer.id]?.scores?.eq ? rubricToPercent(state.assessments[volunteer.id].scores.eq) : volunteer.examResult || 50)) },
    { label: 'Fault isolation', value: scoreAverage(state.volunteers.map((volunteer) => state.assessments[volunteer.id]?.scores?.troubleshooting ? rubricToPercent(state.assessments[volunteer.id].scores.troubleshooting) : volunteer.examResult || 50)) }
  ].sort((a, b) => a.value - b.value);

  document.getElementById('skill-priorities').innerHTML = skillPriorityMap
    .map(
      (item) => `
        <div class="skill-row">
          <div class="skill-meta">
            <span>${item.label}</span>
            <strong>${item.value}%</strong>
          </div>
          <div class="meter"><span style="width: ${item.value}%"></span></div>
        </div>
      `
    )
    .join('');

  const reviewEntries = Object.values(state.assessments)
    .slice(0, 3)
    .map((review) => {
      const volunteer = state.volunteers.find((person) => person.id === Number(Object.keys(state.assessments).find((key) => state.assessments[key] === review)));
      const averageScore = rubricToPercent(scoreAverage(Object.values(review.scores || {})));
      return `
        <div class="review-row">
          <div>
            <strong>${volunteer ? volunteer.name : 'Volunteer'}</strong>
            <small>${review.date}</small>
          </div>
          <span class="review-score">${averageScore}%</span>
        </div>
      `;
    })
    .join('');

  document.getElementById('recent-reviews').innerHTML = reviewEntries || '<p class="empty-state">No practical reviews saved yet.</p>';
}

function renderVolunteers() {
  const volunteerList = document.getElementById('volunteer-list');

  volunteerList.innerHTML = state.volunteers
    .map((volunteer) => {
      const result = volunteer.examResult || 0;
      const volunteerStyles = volunteer.id === selectedVolunteerId ? 'selected-card' : '';
      return `
        <article class="volunteer-card ${volunteerStyles}" data-volunteer-id="${volunteer.id}">
          <div class="volunteer-head">
            <div class="avatar">${initials(volunteer.name)}</div>
            <div>
              <strong>${volunteer.name}</strong>
              <small>${volunteer.role}</small>
            </div>
            <span class="status-pill ${volunteer.status.toLowerCase().replace(/\s+/g, '-')}">${volunteer.status}</span>
          </div>

          <div class="score-line">
            <span>Exam score</span>
            <strong>${result}%</strong>
          </div>

          <div class="focus-tags">
            ${(volunteer.focus || []).map((item) => `<span>${item}</span>`).join('') || '<span>General review</span>'}
          </div>

          <button type="button" class="text-button" data-volunteer-open="${volunteer.id}">Open profile</button>
        </article>
      `;
    })
    .join('');

  volunteerList.querySelectorAll('[data-volunteer-open]').forEach((button) => {
    button.addEventListener('click', () => {
      selectedVolunteerId = Number(button.dataset.volunteerOpen);
      updateVolunteerSelects();
      renderAll();
    });
  });
}

function renderQuiz() {
  const currentVolunteer = getCurrentVolunteer();
  const container = document.getElementById('quiz-container');

  if (!currentVolunteer) {
    container.innerHTML = '<div class="empty-state">Add or register a volunteer to begin the skills exam.</div>';
    return;
  }

  container.innerHTML = `
    <div class="quiz-summary">
      <div>
        <span class="eyebrow muted">SELECTED VOLUNTEER</span>
        <h3>${currentVolunteer.name}</h3>
      </div>
      <span class="score-badge">Current exam: ${currentVolunteer.examResult || 0}%</span>
    </div>
  `;

  skillQuestions.forEach((question) => {
    const card = document.createElement('article');
    card.className = 'question-card';
    card.innerHTML = `
      <p class="question-label">Question ${question.id}</p>
      <h4>${question.question}</h4>
      <div class="answer-list">
        ${question.choices
          .map(
            (choice, index) => `
              <label class="choice-row">
                <input type="radio" name="q-${question.id}" value="${index}" />
                <span>${choice}</span>
              </label>
            `
          )
          .join('')}
      </div>
    `;
    container.appendChild(card);
  });
}

function saveQuiz() {
  const answerMap = {};
  const selectedInputs = document.querySelectorAll('input[type="radio"]:checked');

  selectedInputs.forEach((input) => {
    answerMap[input.name] = Number(input.value);
  });

  let score = 0;
  skillQuestions.forEach((question) => {
    const key = `q-${question.id}`;
    if (answerMap[key] === question.correct) {
      score += 1;
    }
  });

  const percentage = Math.round((score / skillQuestions.length) * 100);
  const volunteer = getCurrentVolunteer();
  volunteer.examResult = percentage;
  volunteer.status = getStatusFromScore(percentage);
  volunteer.lastExam = new Date().toISOString().slice(0, 10);
  saveState();
  renderAll();
  showToast(`${volunteer.name} scored ${percentage}% on the sound exam.`);
}

function syncRangeLabels() {
  const labels = [
    'gain-score',
    'eq-score',
    'dynamics-score',
    'monitor-score',
    'playback-score',
    'troubleshooting-score',
    'communication-score'
  ];

  labels.forEach((id) => {
    const input = document.getElementById(id);
    const output = document.getElementById(`${id}-value`);
    if (input && output) {
      output.textContent = `${input.value}/5`;
    }
  });
}

function renderAssessment() {
  const volunteer = getCurrentVolunteer();
  const assessmentBox = document.getElementById('assessment-header');

  if (!volunteer) {
    assessmentBox.innerHTML = '<div><span class="eyebrow muted">CURRENT EVALUATION</span><h3>No volunteer registered yet</h3></div>';
    return;
  }

  const existing = state.assessments[volunteer.id];

  assessmentBox.innerHTML = `
    <div>
      <span class="eyebrow muted">CURRENT EVALUATION</span>
      <h3>${volunteer.name}</h3>
    </div>
    <span class="score-badge">${volunteer.examResult || 0}% exam</span>
  `;

  const controls = [
    { key: 'gain', id: 'gain-score' },
    { key: 'eq', id: 'eq-score' },
    { key: 'dynamics', id: 'dynamics-score' },
    { key: 'monitor', id: 'monitor-score' },
    { key: 'playback', id: 'playback-score' },
    { key: 'troubleshooting', id: 'troubleshooting-score' },
    { key: 'communication', id: 'communication-score' }
  ];

  controls.forEach(({ key, id }) => {
    const input = document.getElementById(id);
    if (!input) return;

    const value = existing?.scores?.[key] ?? 3;
    input.value = value;
  });

  const notesField = document.getElementById('assessment-notes');
  notesField.value = existing?.notes || '';
  syncRangeLabels();
}

function saveAssessment(event) {
  event.preventDefault();

  const volunteer = getCurrentVolunteer();
  const scores = {
    gain: Number(document.getElementById('gain-score').value),
    eq: Number(document.getElementById('eq-score').value),
    dynamics: Number(document.getElementById('dynamics-score').value),
    monitor: Number(document.getElementById('monitor-score').value),
    playback: Number(document.getElementById('playback-score').value),
    troubleshooting: Number(document.getElementById('troubleshooting-score').value),
    communication: Number(document.getElementById('communication-score').value)
  };

  state.assessments[volunteer.id] = {
    date: new Date().toISOString().slice(0, 10),
    notes: document.getElementById('assessment-notes').value.trim(),
    scores
  };

  const rubricAverage = scoreAverage(Object.values(scores));
  const average = rubricToPercent(rubricAverage);
  volunteer.status = getStatusFromScore(average);
  volunteer.examResult = Math.round((volunteer.examResult || 0) * 0.6 + average * 0.4);
  volunteer.examResult = Math.max(0, Math.min(100, volunteer.examResult));
  volunteer.lastExam = new Date().toISOString().slice(0, 10);

  saveState();
  renderAll();
  showToast(`Assessment saved for ${volunteer.name}.`);
}

function renderTraining() {
  const trainingList = document.getElementById('training-list');

  const trainingCards = state.volunteers
    .map((volunteer) => {
      const assessment = state.assessments[volunteer.id];
      const score = assessment ? rubricToPercent(scoreAverage(Object.values(assessment.scores || {}))) : volunteer.examResult || 0;
      const weakAreas = assessment
        ? Object.entries(assessment.scores || {})
            .filter(([, value]) => value < 3)
            .map(([key]) => formatAreaName(key))
        : ['Gain structure', 'Communication'];

      return `
        <article class="training-card">
          <div class="training-head">
            <div>
              <strong>${volunteer.name}</strong>
              <small>${volunteer.role}</small>
            </div>
            <span class="score-badge">${score}%</span>
          </div>
          <p>Recommended focus:</p>
          <ul>
            ${weakAreas.slice(0, 3).map((area) => `<li>${area}</li>`).join('') || '<li>General live rehearsal and communication</li>'}
          </ul>
        </article>
      `;
    })
    .join('');

  trainingList.innerHTML = trainingCards;
}

function formatAreaName(key) {
  const labels = {
    gain: 'Gain structure',
    eq: 'EQ clarity',
    dynamics: 'Dynamics',
    monitor: 'Monitor mixing',
    playback: 'Playback setup',
    troubleshooting: 'Fault isolation',
    communication: 'Team communication'
  };

  return labels[key] || key;
}

function renderAll() {
  updateVolunteerSelects();
  renderOverview();
  renderVolunteers();
  renderQuiz();
  renderAssessment();
  renderTraining();
}

function navigateTo(target) {
  document.querySelectorAll('.nav-button').forEach((button) => {
    button.classList.toggle('active', button.dataset.target === target);
  });

  document.querySelectorAll('.panel').forEach((section) => {
    section.classList.toggle('active-panel', section.id === target);
  });
}

function addVolunteer() {
  const name = window.prompt('Volunteer full name');
  if (!name || !name.trim()) return;

  const role = window.prompt('Role (for example Front-of-house, Monitor engineer, Playback & recording)', 'Front-of-house');
  if (!role || !role.trim()) return;

  const newVolunteer = {
    id: Date.now(),
    name: name.trim(),
    role: role.trim(),
    status: 'Developing',
    examResult: 0,
    focus: ['General review'],
    lastExam: 'Not yet assessed'
  };

  state.volunteers.push(newVolunteer);
  selectedVolunteerId = newVolunteer.id;
  saveState();
  renderAll();
  showToast(`${newVolunteer.name} added to the roster.`);
}

function resetData() {
  if (!window.confirm('Reset the reviews and volunteer roster to the original demo data?')) {
    return;
  }

  state = JSON.parse(JSON.stringify(defaultState));
  selectedVolunteerId = state.volunteers[0].id;
  saveState();
  renderAll();
  showToast('Demo data restored.');
}

let signingUp = false;

function getUsers() {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
  } catch (error) {
    return [];
  }
}

function enterApp() {
  document.getElementById('auth-screen').classList.add('hidden');
  document.querySelector('.app-shell').classList.remove('hidden');
  renderAll();
}

function updateAuthMode() {
  signingUp = !signingUp;
  document.getElementById('signup-details-wrap').classList.toggle('hidden', !signingUp);
  document.getElementById('auth-copy').textContent = signingUp
    ? 'Create your account to register as a sound-team volunteer.'
    : 'Sign in to access your sound-team assessments.';
  document.getElementById('auth-submit').textContent = signingUp ? 'Create account' : 'Sign in';
  document.getElementById('auth-toggle').textContent = signingUp
    ? 'Already registered? Sign in'
    : 'New volunteer? Create an account';
  document.getElementById('auth-password').setAttribute('autocomplete', signingUp ? 'new-password' : 'current-password');
  document.getElementById('auth-error').textContent = '';
}

function handleAuth(event) {
  event.preventDefault();
  const error = document.getElementById('auth-error');
  const email = document.getElementById('auth-email').value.trim().toLowerCase();
  const password = document.getElementById('auth-password').value;
  const firstName = document.getElementById('auth-first-name').value.trim();
  const middleName = document.getElementById('auth-middle-name').value.trim();
  const lastName = document.getElementById('auth-last-name').value.trim();
  const phone = document.getElementById('auth-phone').value.trim();
  const users = getUsers();

  error.textContent = '';

  if (!email || !password) {
    error.textContent = 'Enter your email address and password.';
    return;
  }

  if (signingUp) {
    if (!firstName || !lastName) {
      error.textContent = 'Enter your first name and last name.';
      return;
    }
    if (!phone) {
      error.textContent = 'Enter your phone number.';
      return;
    }
    if (users.some((user) => user.email === email)) {
      error.textContent = 'An account already exists for this email.';
      return;
    }

    const name = [firstName, middleName, lastName].filter(Boolean).join(' ');
    const user = { id: Date.now(), name, firstName, middleName, lastName, phone, email, password, role: 'volunteer' };
    users.push(user);
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
    localStorage.setItem(SESSION_KEY, email);

    const alreadyRegistered = state.volunteers.some((volunteer) => volunteer.email === email);
    if (!alreadyRegistered) {
      state.volunteers.push({
        id: user.id,
        name,
        firstName,
        middleName,
        lastName,
        phone,
        email,
        role: 'Volunteer',
        status: 'Developing',
        examResult: 0,
        focus: ['General review'],
        lastExam: 'Not yet assessed'
      });
      saveState();
    }
  } else {
    const user = users.find((account) => account.email === email && account.password === password);
    if (!user) {
      error.textContent = 'Email or password is incorrect.';
      return;
    }
    localStorage.setItem(SESSION_KEY, email);
  }

  enterApp();
}

document.getElementById('auth-form').addEventListener('submit', handleAuth);
document.getElementById('auth-toggle').addEventListener('click', updateAuthMode);

const registrationHelp = document.getElementById('registration-help');
const fieldHelp = {
  'first-name': ['First name', 'Enter the name you are usually called by. This can be your preferred name rather than a legal name if that is what your team knows you by.'],
  'middle-name': ['Middle name', 'This field is optional. Leave it blank if you do not have one or do not want it shown. Enter your middle name only when it is part of the name you use.'],
  'last-name': ['Last name', 'Enter your surname or family name exactly as you normally use it.'],
  phone: ['Phone number', 'Enter a mobile or phone number the sound-team coordinator can use to contact you about shifts or urgent changes. Include your country code when needed.'],
  email: ['Email address', 'Enter an email address that you can access. It is used to identify and sign in to your account.'],
  password: ['Password', 'Choose a password with at least six characters. Do not share it with anyone, including other volunteers.']
};

document.querySelectorAll('[data-field-help]').forEach((button) => {
  button.addEventListener('click', () => {
    const [title, description] = fieldHelp[button.dataset.fieldHelp];
    document.getElementById('registration-help-title').textContent = title;
    document.querySelector('.help-content').innerHTML = `<p>${description}</p>`;
    registrationHelp.showModal();
  });
});
document.getElementById('registration-help-close').addEventListener('click', () => registrationHelp.close());
document.getElementById('registration-help-done').addEventListener('click', () => registrationHelp.close());
registrationHelp.addEventListener('click', (event) => {
  if (event.target === registrationHelp) registrationHelp.close();
});
document.getElementById('logout-button').addEventListener('click', () => {
  localStorage.removeItem(SESSION_KEY);
  document.querySelector('.app-shell').classList.add('hidden');
  document.getElementById('auth-screen').classList.remove('hidden');
  document.getElementById('auth-form').reset();
});


document.getElementById('save-quiz').addEventListener('click', saveQuiz);
document.getElementById('assessment-form').addEventListener('submit', saveAssessment);
document.getElementById('exam-volunteer-select').addEventListener('change', (event) => {
  selectedVolunteerId = Number(event.target.value);
  renderAll();
});
document.getElementById('assessment-volunteer-select').addEventListener('change', (event) => {
  selectedVolunteerId = Number(event.target.value);
  renderAll();
});
document.getElementById('add-volunteer').addEventListener('click', addVolunteer);
document.getElementById('reset-data').addEventListener('click', resetData);

[...document.querySelectorAll('input[type="range"]')].forEach((range) => {
  range.addEventListener('input', syncRangeLabels);
});

// The interface opens on the sign-in screen. A saved session does not hide
// registration behind the dashboard when the page is refreshed.
localStorage.removeItem(SESSION_KEY);
document.getElementById('auth-screen').classList.remove('hidden');
document.querySelector('.app-shell').classList.add('hidden');
