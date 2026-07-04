// ============================================================
// CONFIG
// If you serve this file from the SAME Express server (via
// app.use(express.static('public'))), leave API_BASE empty —
// fetch('/properties') already hits your own API.
// If you ever host the frontend separately, set API_BASE to
// your full Codespaces forwarded URL, e.g.
// 'https://your-codespace-name-3000.app.github.dev'
// ============================================================
const API_BASE = '';

const COLORS = {
  indigo: '#5B5FEF',
  violet: '#8B5CF6',
  coral: '#F97362',
  amber: '#F5A623',
  teal: '#17C3B2',
  green: '#22C55E',
  grey: '#D8DCEA'
};

async function getJSON(path) {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) throw new Error(`Request failed: ${path}`);
  return res.json();
}

// ============================================================
// KPI CARDS
// ============================================================
async function loadKpis() {
  try {
    const [properties, investors] = await Promise.all([
      getJSON('/properties'),
      getJSON('/investors')
    ]);
    document.getElementById('kpi-properties').textContent = properties.length;
    document.getElementById('kpi-investors').textContent = investors.length;
  } catch (err) {
    console.error('KPI (properties/investors) error:', err);
  }
}

// ============================================================
// RENTAL YIELD — Bar chart + avg yield KPI + top properties table
// ============================================================
async function loadRentalYield() {
  try {
    const data = await getJSON('/analytics/rental-yield');

    // KPI: average yield across properties that have a valid % value
    const validYields = data.map(d => parseFloat(d.rental_yield_percent)).filter(v => !isNaN(v));
    const avgYield = validYields.length
      ? (validYields.reduce((a, b) => a + b, 0) / validYields.length).toFixed(2)
      : '0.00';
    document.getElementById('kpi-yield').textContent = `${avgYield}%`;

    // Bar chart
    const ctx = document.getElementById('yieldBarChart');
    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: data.map(d => d.address.split(',')[0]),
        datasets: [{
          label: 'Rental Yield %',
          data: data.map(d => d.rental_yield_percent),
          backgroundColor: COLORS.indigo,
          borderRadius: 6,
          maxBarThickness: 40
        }]
      },
      options: baseBarOptions('Yield %')
    });

    // Table — sort by yield descending, show top rows
    const sorted = [...data].sort((a, b) => (b.rental_yield_percent || 0) - (a.rental_yield_percent || 0));
    const tbody = document.getElementById('propertyTableBody');
    tbody.innerHTML = sorted.map(row => `
      <tr>
        <td>${row.address}</td>
        <td>${row.city}</td>
        <td>Rs ${Number(row.annual_rent).toLocaleString()}</td>
        <td>Rs ${Number(row.latest_valuation).toLocaleString()}</td>
        <td><span class="yield-pill">${row.rental_yield_percent}%</span></td>
      </tr>
    `).join('');
  } catch (err) {
    console.error('Rental yield error:', err);
  }
}

// ============================================================
// OCCUPANCY — Doughnut + occupancy rate KPI
// ============================================================
async function loadOccupancy() {
  try {
    const data = await getJSON('/analytics/occupancy-rate');
    const summary = data.summary; // [{status, count}]
    const occupied = summary.find(s => s.status === 'occupied')?.count || 0;
    const vacant = summary.find(s => s.status === 'vacant')?.count || 0;
    const total = occupied + vacant;
    const rate = total ? ((occupied / total) * 100).toFixed(1) : '0.0';
    document.getElementById('kpi-occupancy').textContent = `${rate}%`;

    const ctx = document.getElementById('occupancyChart');
    new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Occupied', 'Vacant'],
        datasets: [{
          data: [occupied, vacant],
          backgroundColor: [COLORS.teal, COLORS.grey],
          borderWidth: 0
        }]
      },
      options: baseDoughnutOptions()
    });

    renderLegend('occupancyLegend', [
      { label: 'Occupied', value: occupied, color: COLORS.teal },
      { label: 'Vacant', value: vacant, color: COLORS.grey }
    ]);
  } catch (err) {
    console.error('Occupancy error:', err);
  }
}

// ============================================================
// EXPENSE BREAKDOWN — Pie chart
// ============================================================
async function loadExpenseBreakdown() {
  try {
    const data = await getJSON('/analytics/expense-breakdown');
    const palette = [COLORS.indigo, COLORS.coral, COLORS.amber, COLORS.teal, COLORS.violet];

    const ctx = document.getElementById('expensePieChart');
    new Chart(ctx, {
      type: 'pie',
      data: {
        labels: data.map(d => d.expense_category),
        datasets: [{
          data: data.map(d => d.total_amount),
          backgroundColor: data.map((_, i) => palette[i % palette.length]),
          borderWidth: 2,
          borderColor: '#fff'
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 11 } } }
        }
      }
    });
  } catch (err) {
    console.error('Expense breakdown error:', err);
  }
}

// ============================================================
// RENT COLLECTION STATUS — Doughnut
// ============================================================
async function loadRentStatus() {
  try {
    const data = await getJSON('/analytics/rent-collection');
    const statusColor = { on_time: COLORS.green, late: COLORS.amber, missed: COLORS.coral };

    const ctx = document.getElementById('rentStatusChart');
    new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: data.map(d => d.payment_status),
        datasets: [{
          data: data.map(d => d.count),
          backgroundColor: data.map(d => statusColor[d.payment_status] || COLORS.grey),
          borderWidth: 0
        }]
      },
      options: baseDoughnutOptions()
    });

    renderLegend('rentStatusLegend', data.map(d => ({
      label: d.payment_status.replace('_', ' '),
      value: d.count,
      color: statusColor[d.payment_status] || COLORS.grey
    })));
  } catch (err) {
    console.error('Rent status error:', err);
  }
}

// ============================================================
// MONTHLY RENT COLLECTED — Area chart
// ============================================================
async function loadMonthlyRentCollected() {
  try {
    const data = await getJSON('/analytics/monthly-rent-collection');
    const ctx = document.getElementById('rentCollectedChart');
    new Chart(ctx, {
      type: 'line',
      data: {
        labels: data.map(d => d.month),
        datasets: [{
          label: 'Rent Collected (Rs)',
          data: data.map(d => d.total_collected),
          borderColor: COLORS.indigo,
          backgroundColor: 'rgba(91, 95, 239, 0.15)',
          fill: true,
          tension: 0.35,
          pointRadius: 3,
          pointBackgroundColor: COLORS.indigo
        }]
      },
      options: baseBarOptions('Amount (Rs)')
    });
  } catch (err) {
    console.error('Monthly rent collected error:', err);
  }
}

// ============================================================
// MORTGAGE BALANCE REDUCTION — Line chart (multi-series)
// ============================================================
async function loadMortgageLine() {
  try {
    const payments = await getJSON('/mortgage-payments');
    const mortgages = await getJSON('/mortgages');

    // group payments by mortgage_id
    const grouped = {};
    payments.forEach(p => {
      if (!grouped[p.mortgage_id]) grouped[p.mortgage_id] = [];
      grouped[p.mortgage_id].push(p);
    });

    const palette = [COLORS.indigo, COLORS.coral, COLORS.teal, COLORS.amber, COLORS.violet];
    const allMonths = [...new Set(payments.map(p => p.due_date.slice(0, 10)))].sort();

    const datasets = Object.keys(grouped).map((mortgageId, i) => {
      const rows = grouped[mortgageId].sort((a, b) => new Date(a.due_date) - new Date(b.due_date));
      const lender = mortgages.find(m => m.mortgage_id == mortgageId)?.lender_name || `Mortgage ${mortgageId}`;
      const dataMap = {};
      rows.forEach(r => { dataMap[r.due_date.slice(0, 10)] = r.remaining_balance; });
      return {
        label: lender,
        data: allMonths.map(m => dataMap[m] ?? null),
        borderColor: palette[i % palette.length],
        backgroundColor: palette[i % palette.length],
        spanGaps: true,
        tension: 0.3,
        pointRadius: 2
      };
    });

    const ctx = document.getElementById('mortgageLineChart');
    new Chart(ctx, {
      type: 'line',
      data: { labels: allMonths, datasets },
      options: {
        ...baseBarOptions('Remaining Balance (Rs)'),
        plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 10 } } } }
      }
    });
  } catch (err) {
    console.error('Mortgage line chart error:', err);
  }
}

// ============================================================
// ROI BY INVESTOR — Bar chart
// ============================================================
async function loadRoiByInvestor() {
  try {
    const data = await getJSON('/analytics/roi');

    // average roi_percent per investor (an investor can have multiple investments)
    const byInvestor = {};
    data.forEach(row => {
      if (!byInvestor[row.investor_name]) byInvestor[row.investor_name] = [];
      byInvestor[row.investor_name].push(parseFloat(row.roi_percent) || 0);
    });
    const labels = Object.keys(byInvestor);
    const values = labels.map(name => {
      const arr = byInvestor[name];
      return (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(2);
    });

    const ctx = document.getElementById('roiBarChart');
    new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Avg ROI %',
          data: values,
          backgroundColor: COLORS.violet,
          borderRadius: 6,
          maxBarThickness: 40
        }]
      },
      options: baseBarOptions('ROI %')
    });
  } catch (err) {
    console.error('ROI chart error:', err);
  }
}

// ============================================================
// CHART OPTION HELPERS
// ============================================================
function baseBarOptions(yLabel) {
  return {
    responsive: true,
    plugins: { legend: { display: false } },
    scales: {
      y: {
        beginAtZero: true,
        title: { display: !!yLabel, text: yLabel, font: { size: 11 } },
        grid: { color: '#EDEFF5' }
      },
      x: { grid: { display: false } }
    }
  };
}

function baseDoughnutOptions() {
  return {
    responsive: true,
    cutout: '68%',
    plugins: { legend: { display: false } }
  };
}

function renderLegend(elementId, items) {
  const el = document.getElementById(elementId);
  el.innerHTML = items.map(item => `
    <span><span class="dot" style="background:${item.color}"></span>${item.label} (${item.value})</span>
  `).join('');
}

// ============================================================
// INIT — run everything once the page loads
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  loadKpis();
  loadRentalYield();
  loadOccupancy();
  loadExpenseBreakdown();
  loadRentStatus();
  loadMonthlyRentCollected();
  loadMortgageLine();
  loadRoiByInvestor();
});