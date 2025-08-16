'use strict';

// Utilities
const byId = (id) => document.getElementById(id);
const qs = (sel, el = document) => el.querySelector(sel);
const qsa = (sel, el = document) => Array.from(el.querySelectorAll(sel));

// DOM refs
const basicKeysEl = byId('basic-keys');
const sciKeysEl = byId('sci-keys');
const basicDisplay = byId('basic-display');
const globalInput = byId('global-input');

// Key layouts
const basicKeys = [
	'7','8','9','/','4','5','6','*','1','2','3','-','0','.','=','+'
];
const sciKeys = [
	'(',')','^','%','sin','cos','tan','log','ln','sqrt','pi','e','ANS','AC','DEL','EXP'
];

let lastAnswer = 0;

function createKey(label, { variant } = { variant: 'default' }) {
	const button = document.createElement('button');
	button.className = 'key' + (variant && variant !== 'default' ? ' ' + variant : '');
	button.textContent = label;
	button.setAttribute('data-key', label);
	return button;
}

function renderKeys() {
	basicKeys.forEach((k) => {
		const variant = k === '=' ? 'primary' : (['+','-','*','/'].includes(k) ? 'accent' : 'default');
		basicKeysEl.appendChild(createKey(k, { variant }));
	});
	sciKeys.forEach((k) => {
		const variant = ['AC','DEL'].includes(k) ? 'danger' : (['sin','cos','tan','sqrt','log','ln'].includes(k) ? 'accent' : 'default');
		sciKeysEl.appendChild(createKey(k, { variant }));
	});
}

function insertAtCursor(str) {
	const current = basicDisplay.value;
	basicDisplay.value = current + str;
	basicDisplay.scrollLeft = basicDisplay.scrollWidth;
}

function handleKeyPress(label) {
	switch (label) {
		case 'AC':
			basicDisplay.value = '';
			break;
		case 'DEL':
			basicDisplay.value = basicDisplay.value.slice(0, -1);
			break;
		case '=':
			try {
				const expr = transformForMathJs(basicDisplay.value);
				const result = math.evaluate(expr, { pi: Math.PI, e: Math.E, ANS: lastAnswer });
				lastAnswer = result;
				basicDisplay.value = String(result);
			} catch (err) {
				basicDisplay.value = 'Error';
			}
			break;
		case 'ANS':
			insertAtCursor(String(lastAnswer));
			break;
		case 'EXP':
			insertAtCursor('e^(');
			break;
		case 'pi':
			insertAtCursor('pi');
			break;
		case 'e':
			insertAtCursor('e');
			break;
		case 'sin':
			insertAtCursor('sin(');
			break;
		case 'cos':
			insertAtCursor('cos(');
			break;
		case 'tan':
			insertAtCursor('tan(');
			break;
		case 'log':
			insertAtCursor('log10(');
			break;
		case 'ln':
			insertAtCursor('log(');
			break;
		case 'sqrt':
			insertAtCursor('sqrt(');
			break;
		default:
			insertAtCursor(label);
	}
}

function transformForMathJs(input) {
	// Convert caret exponent to mathjs pow
	return input
		.replace(/\^/g, '^')
		.replace(/π/g, 'pi');
}

function bindKeyHandlers() {
	[basicKeysEl, sciKeysEl].forEach((root) => {
		root.addEventListener('click', (e) => {
			const btn = e.target.closest('button.key');
			if (!btn) return;
			handleKeyPress(btn.getAttribute('data-key'));
		});
	});
}

function bindGlobalInput() {
	globalInput.addEventListener('keydown', (e) => {
		if (e.key === 'Enter') {
			e.preventDefault();
			const query = globalInput.value.trim();
			if (!query) return;
			handleGlobalQuery(query);
		}
	});
}

function handleGlobalQuery(query) {
	// Try unit conversion: pattern "a unit to unit"
	const unitMatch = query.match(/^(.*)\s+to\s+(\S+)$/i);
	if (unitMatch) {
		const valExpr = unitMatch[1];
		const toUnit = unitMatch[2];
		try {
			const value = math.evaluate(valExpr);
			const res = math.unit(value).to(toUnit);
			byId('unit-output').textContent = String(res.toString());
			return;
		} catch (e) { /* fallthrough */ }
	}

	// Algebra keywords
	if (/^(solve|factor|expand|diff|derive|derivative|int|integrate)\b/i.test(query)) {
		byId('algebra-input').value = query;
		runAlgebra();
		return;
	}

	// Else evaluate as expression
	try {
		const res = math.evaluate(query);
		basicDisplay.value = String(res);
		lastAnswer = res;
	} catch (e) {
		basicDisplay.value = 'Error';
	}
}

// Algebra & Calculus
const algebraInput = byId('algebra-input');
const algebraRunBtn = byId('algebra-run');
const algebraOutput = byId('algebra-output');

function runAlgebra() {
	const q = algebraInput.value.trim();
	if (!q) return;
	try {
		if (/^solve\b/i.test(q)) {
			// e.g., solve x^2-4=0 for x
			const eq = q.replace(/^solve\s*/i, '').trim();
			const sol = nerdamer.solveEquations(eq);
			algebraOutput.textContent = JSON.stringify(sol, null, 2);
			return;
		}
		if (/^factor\b/i.test(q)) {
			const expr = q.replace(/^factor\s*/i, '');
			algebraOutput.textContent = String(nerdamer.factor(expr).toString());
			return;
		}
		if (/^(expand)\b/i.test(q)) {
			const expr = q.replace(/^expand\s*/i, '');
			algebraOutput.textContent = String(nerdamer.expand(expr).toString());
			return;
		}
		if (/^(diff|derive|derivative)\b/i.test(q)) {
			// forms: diff x^3, diff x^3 wrt x
			const body = q.replace(/^(diff|derive|derivative)\s*/i, '');
			const wrtMatch = body.match(/\b(wrt|with respect to)\s+([a-zA-Z])/i);
			const variable = wrtMatch ? wrtMatch[2] : 'x';
			const expr = body.replace(/\b(wrt|with respect to)\s+[a-zA-Z]/i, '').trim();
			algebraOutput.textContent = String(nerdamer.diff(expr, variable).toString());
			return;
		}
		if (/^(int|integrate)\b/i.test(q)) {
			const body = q.replace(/^(int|integrate)\s*/i, '');
			const wrtMatch = body.match(/\b(wrt|with respect to)\s+([a-zA-Z])/i);
			const variable = wrtMatch ? wrtMatch[2] : 'x';
			const expr = body.replace(/\b(wrt|with respect to)\s+[a-zA-Z]/i, '').trim();
			algebraOutput.textContent = String(nerdamer.integrate(expr, variable).toString());
			return;
		}
		// Fallback - evaluate
		algebraOutput.textContent = String(nerdamer(q).toString());
	} catch (err) {
		algebraOutput.textContent = 'Error: ' + err.message;
	}
}

algebraRunBtn.addEventListener('click', runAlgebra);

// Units
const unitInput = byId('unit-input');
const unitRunBtn = byId('unit-run');
const unitOutput = byId('unit-output');

function runUnit() {
	const text = unitInput.value.trim();
	if (!text) return;
	const m = text.match(/^(.*)\s+to\s+(\S+)$/i);
	try {
		if (m) {
			const valExpr = m[1];
			const toUnit = m[2];
			const value = math.evaluate(valExpr);
			const res = math.unit(value).to(toUnit);
			unitOutput.textContent = res.toString();
		} else {
			const v = math.evaluate(text);
			unitOutput.textContent = String(v);
		}
	} catch (e) {
		unitOutput.textContent = 'Error';
	}
}
unitRunBtn.addEventListener('click', runUnit);

// Statistics
const statInput = byId('stat-input');
const statOutput = byId('stat-output');
qsa('.stat-actions button').forEach((btn) => {
	btn.addEventListener('click', () => {
		const raw = statInput.value.trim();
		if (!raw) return;
		const nums = raw.split(/[\s,]+/).map(Number).filter((n) => Number.isFinite(n));
		let res = '';
		switch (btn.getAttribute('data-stat')) {
			case 'mean': res = math.mean(nums); break;
			case 'median': res = math.median(nums); break;
			case 'mode': res = JSON.stringify(math.mode(nums)); break;
			case 'std': res = math.std(nums); break;
			case 'var': res = math.var(nums); break;
			default: res = 'N/A';
		}
		statOutput.textContent = String(res);
	});
});

// Plotter
const plotFx = byId('plot-fx');
const plotRange = byId('plot-range');
const plotRun = byId('plot-run');

function runPlot() {
	const fxText = plotFx.value || 'sin(x)';
	const rangeText = plotRange.value || '-6.28,6.28';
	const [minStr, maxStr] = rangeText.split(',');
	const xMin = Number(minStr);
	const xMax = Number(maxStr);
	if (!Number.isFinite(xMin) || !Number.isFinite(xMax) || xMin >= xMax) {
		return;
	}
	const samples = 500;
	const xs = [];
	const ys = [];
	for (let i = 0; i <= samples; i++) {
		const x = xMin + (i * (xMax - xMin)) / samples;
		try {
			const y = math.evaluate(fxText, { x });
			xs.push(x);
			ys.push(Number.isFinite(y) ? y : NaN);
		} catch (e) {
			xs.push(x);
			ys.push(NaN);
		}
	}
	Plotly.newPlot('plot', [{ x: xs, y: ys, mode: 'lines', line: { color: '#22d3ee' } }], { margin: { t: 10, r: 10, b: 30, l: 40 }, paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(0,0,0,0)' }, { displayModeBar: false });
}
plotRun.addEventListener('click', runPlot);

// Init
renderKeys();
bindKeyHandlers();
bindGlobalInput();