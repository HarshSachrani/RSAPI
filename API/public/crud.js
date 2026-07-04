// ============================================================
// GENERIC CRUD UI ENGINE
// One config object per table + one renderer function.
// This mirrors the same idea as the backend's registerCrudRoutes:
// write the logic once, describe each table with data, not code.
// ============================================================

const CRUD_API_BASE = ''; // same as script.js — same-origin, no CORS needed

const TABLES = {
  properties: {
    title: 'Properties',
    route: 'properties',
    idColumn: 'property_id',
    fields: [
      { name: 'owner_id', label: 'Owner ID', type: 'number', required: true },
      { name: 'address', label: 'Address', type: 'text', required: true },
      { name: 'city', label: 'City', type: 'text' },
      { name: 'property_type', label: 'Type', type: 'select', options: ['residential', 'commercial'] },
      { name: 'size_sqft', label: 'Size (sqft)', type: 'number' },
      { name: 'bedrooms', label: 'Bedrooms', type: 'number' },
      { name: 'purchase_price', label: 'Purchase Price (Rs)', type: 'number' },
      { name: 'purchase_date', label: 'Purchase Date', type: 'date' },
      { name: 'status', label: 'Status', type: 'select', options: ['active', 'sold'] }
    ]
  },
  investors: {
    title: 'Investors',
    route: 'investors',
    idColumn: 'investor_id',
    fields: [
      { name: 'name', label: 'Name', type: 'text', required: true },
      { name: 'email', label: 'Email', type: 'email', required: true },
      { name: 'phone', label: 'Phone', type: 'text' },
      { name: 'investor_type', label: 'Type', type: 'select', options: ['individual', 'institutional'] }
    ]
  },
  tenants: {
    title: 'Tenants',
    route: 'tenants',
    idColumn: 'tenant_id',
    fields: [
      { name: 'name', label: 'Name', type: 'text', required: true },
      { name: 'email', label: 'Email', type: 'email' },
      { name: 'phone', label: 'Phone', type: 'text' },
      { name: 'national_id', label: 'National ID (CNIC)', type: 'text' }
    ]
  },
  leases: {
    title: 'Leases',
    route: 'leases',
    idColumn: 'lease_id',
    fields: [
      { name: 'property_id', label: 'Property ID', type: 'number', required: true },
      { name: 'tenant_id', label: 'Tenant ID', type: 'number', required: true },
      { name: 'start_date', label: 'Start Date', type: 'date' },
      { name: 'end_date', label: 'End Date', type: 'date' },
      { name: 'monthly_rent', label: 'Monthly Rent (Rs)', type: 'number', required: true },
      { name: 'security_deposit', label: 'Security Deposit (Rs)', type: 'number' },
      { name: 'status', label: 'Status', type: 'select', options: ['active', 'terminated', 'expired'] }
    ]
  },
  expenses: {
    title: 'Expenses',
    route: 'expenses',
    idColumn: 'expense_id',
    fields: [
      { name: 'property_id', label: 'Property ID', type: 'number', required: true },
      { name: 'expense_category', label: 'Category', type: 'select', options: ['tax', 'utility', 'repair', 'insurance', 'management_fee'] },
      { name: 'amount', label: 'Amount (Rs)', type: 'number', required: true },
      { name: 'expense_date', label: 'Date', type: 'date' },
      { name: 'description', label: 'Description', type: 'text' }
    ]
  },
  mortgages: {
    title: 'Mortgages',
    route: 'mortgages',
    idColumn: 'mortgage_id',
    fields: [
      { name: 'property_id', label: 'Property ID', type: 'number', required: true },
      { name: 'lender_name', label: 'Lender Name', type: 'text' },
      { name: 'principal_amount', label: 'Principal Amount (Rs)', type: 'number' },
      { name: 'interest_rate', label: 'Interest Rate (%)', type: 'number' },
      { name: 'term_years', label: 'Term (Years)', type: 'number' },
      { name: 'start_date', label: 'Start Date', type: 'date' }
    ]
  },
  maintenance: {
    title: 'Maintenance Requests',
    route: 'maintenance',
    idColumn: 'request_id',
    fields: [
      { name: 'property_id', label: 'Property ID', type: 'number', required: true },
      { name: 'tenant_id', label: 'Tenant ID (optional)', type: 'number' },
      { name: 'issue_description', label: 'Issue Description', type: 'text' },
      { name: 'request_date', label: 'Request Date', type: 'date' },
      { name: 'resolved_date', label: 'Resolved Date', type: 'date' },
      { name: 'cost', label: 'Cost (Rs)', type: 'number' },
      { name: 'status', label: 'Status', type: 'select', options: ['open', 'in_progress', 'resolved'] }
    ]
  }
};

// Track which id is currently being edited, per table
const editingState = {};

// ============================================================
// BUILD THE HTML SHELL FOR EVERY TABLE (once, on page load)
// ============================================================
function buildAllCrudSections() {
  const root = document.getElementById('crud-root');

  Object.keys(TABLES).forEach(key => {
    const table = TABLES[key];
    editingState[key] = null;

    const section = document.createElement('div');
    section.className = 'page';
    section.id = `page-${key}`;
    section.style.display = 'none';

    section.innerHTML = `
      <div class="topbar">
        <div>
          <h1 class="page-title">${table.title}</h1>
          <p class="page-subtitle">Add, edit, or remove ${table.title.toLowerCase()}</p>
        </div>
      </div>

      <div class="card chart-card mb-3">
        <div class="chart-card-header">
          <h2 id="form-title-${key}">Add ${table.title.slice(0, -1)}</h2>
        </div>
        <form id="form-${key}" class="row g-3 crud-form"></form>
      </div>

      <div class="card chart-card">
        <div class="chart-card-header">
          <h2>All ${table.title}</h2>
        </div>
        <div class="table-responsive">
          <table class="table table-clean">
            <thead><tr id="thead-${key}"></tr></thead>
            <tbody id="tbody-${key}"><tr><td class="text-muted">Loading...</td></tr></tbody>
          </table>
        </div>
      </div>
    `;
    root.appendChild(section);

    buildForm(key);
    buildTableHeader(key);
  });
}

// ============================================================
// BUILD FORM INPUTS FROM FIELD CONFIG
// ============================================================
function buildForm(key) {
  const table = TABLES[key];
  const form = document.getElementById(`form-${key}`);

  const inputsHtml = table.fields.map(field => {
    const inputId = `${key}-${field.name}`;
    let inputHtml;
    if (field.type === 'select') {
      inputHtml = `
        <select class="form-select" id="${inputId}" ${field.required ? 'required' : ''}>
          <option value="">Select...</option>
          ${field.options.map(opt => `<option value="${opt}">${opt}</option>`).join('')}
        </select>`;
    } else {
      inputHtml = `<input type="${field.type}" class="form-control" id="${inputId}" ${field.required ? 'required' : ''}>`;
    }
    return `
      <div class="col-md-4">
        <label class="form-label small" for="${inputId}">${field.label}</label>
        ${inputHtml}
      </div>`;
  }).join('');

  form.innerHTML = `
    ${inputsHtml}
    <div class="col-12 mt-2">
      <button type="submit" class="btn btn-primary-custom">Save</button>
      <button type="button" class="btn btn-outline-secondary btn-sm ms-2" onclick="cancelEdit('${key}')">Cancel edit</button>
    </div>
  `;

  form.addEventListener('submit', (e) => handleSubmit(e, key));
}

function buildTableHeader(key) {
  const table = TABLES[key];
  const thead = document.getElementById(`thead-${key}`);
  const headers = table.fields.map(f => `<th>${f.label}</th>`).join('');
  thead.innerHTML = `<th>${table.idColumn}</th>${headers}<th>Actions</th>`;
}

// ============================================================
// LOAD + RENDER ROWS
// ============================================================
async function loadTableData(key) {
  const table = TABLES[key];
  const tbody = document.getElementById(`tbody-${key}`);
  try {
    const res = await fetch(`${CRUD_API_BASE}/${table.route}`);
    const rows = await res.json();

    if (!rows.length) {
      tbody.innerHTML = `<tr><td colspan="${table.fields.length + 2}" class="text-muted">No records yet.</td></tr>`;
      return;
    }

    tbody.innerHTML = rows.map(row => `
      <tr>
        <td>${row[table.idColumn]}</td>
        ${table.fields.map(f => `<td>${row[f.name] ?? ''}</td>`).join('')}
        <td>
          <button class="btn btn-sm btn-outline-primary me-1" onclick='startEdit("${key}", ${JSON.stringify(row).replace(/'/g, "&#39;")})'>Edit</button>
          <button class="btn btn-sm btn-outline-danger" onclick="deleteRow('${key}', ${row[table.idColumn]})">Delete</button>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td class="text-danger">Failed to load data: ${err.message}</td></tr>`;
  }
}

// ============================================================
// CREATE / UPDATE
// ============================================================
async function handleSubmit(e, key) {
  e.preventDefault();
  const table = TABLES[key];
  const body = {};
  table.fields.forEach(f => {
    const val = document.getElementById(`${key}-${f.name}`).value;
    body[f.name] = val === '' ? null : val;
  });

  const editingId = editingState[key];
  const url = editingId
    ? `${CRUD_API_BASE}/${table.route}/${editingId}`
    : `${CRUD_API_BASE}/${table.route}`;
  const method = editingId ? 'PUT' : 'POST';

  try {
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      const errData = await res.json();
      alert(`Error: ${errData.error || 'Something went wrong'}`);
      return;
    }
    cancelEdit(key);
    loadTableData(key);
  } catch (err) {
    alert(`Request failed: ${err.message}`);
  }
}

function startEdit(key, row) {
  const table = TABLES[key];
  table.fields.forEach(f => {
    const el = document.getElementById(`${key}-${f.name}`);
    if (el) el.value = row[f.name] ?? '';
  });
  editingState[key] = row[table.idColumn];
  document.getElementById(`form-title-${key}`).textContent = `Editing ${table.title.slice(0, -1)} #${row[table.idColumn]}`;
  document.getElementById(`page-${key}`).scrollIntoView({ behavior: 'smooth' });
}

function cancelEdit(key) {
  const table = TABLES[key];
  editingState[key] = null;
  document.getElementById(`form-${key}`).reset();
  document.getElementById(`form-title-${key}`).textContent = `Add ${table.title.slice(0, -1)}`;
}

// ============================================================
// DELETE
// ============================================================
async function deleteRow(key, id) {
  const table = TABLES[key];
  if (!confirm(`Delete this ${table.title.slice(0, -1).toLowerCase()}? This cannot be undone.`)) return;
  try {
    const res = await fetch(`${CRUD_API_BASE}/${table.route}/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const errData = await res.json();
      alert(`Error: ${errData.error || 'Could not delete'}`);
      return;
    }
    loadTableData(key);
  } catch (err) {
    alert(`Request failed: ${err.message}`);
  }
}

// ============================================================
// NAV SWITCHING
// ============================================================
function switchSection(sectionKey) {
  // hide all pages
  document.querySelectorAll('.page').forEach(p => p.style.display = 'none');
  // show the one we want
  document.getElementById(`page-${sectionKey}`).style.display = 'block';

  // update active nav link
  document.querySelectorAll('.sidebar .nav-link').forEach(link => {
    link.classList.toggle('active', link.dataset.section === sectionKey);
  });

  // lazy-load table data the first time a section is opened
  if (sectionKey !== 'dashboard') {
    loadTableData(sectionKey);
  }
}

// ============================================================
// INIT
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  buildAllCrudSections();

  document.querySelectorAll('.sidebar .nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      switchSection(link.dataset.section);
    });
  });
});