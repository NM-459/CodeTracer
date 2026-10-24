const $ = (selector) => document.querySelector(selector);
const codeInput = $("#codeInput");
const errorInput = $("#errorInput");
const languageSelect = $("#language");
const fileInput = $("#fileInput");
const analyzeBtn = $("#analyzeBtn");
const toast = $("#toast");
let lastAnalysis = null;
let lastFileName = "";

const samples = {
  python: "def add(a, b):\n    return a - b\n\nprint(add(2, 3))",
  javascript:
    "function add(a, b) {\n  return a - b;\n}\n\nconsole.log(add(2, 3));",
  cpp: "#include <iostream>\nusing namespace std;\n\nint main() {\n    int total = 2 - 3;\n    cout << total << endl;\n    return 0;\n}",
  java: "public class Main {\n    static int add(int a, int b) {\n        return a - b;\n    }\n    public static void main(String[] args) {\n        System.out.println(add(2, 3));\n    }\n}",
};
const extensions = {
  py: "python",
  js: "javascript",
  cpp: "cpp",
  java: "java",
  txt: "other",
};
const languageNames = Object.fromEntries(
  [...languageSelect.options].map((option) => [option.value, option.text]),
);

function toastMessage(message) {
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastMessage.timer);
  toastMessage.timer = setTimeout(() => toast.classList.remove("show"), 2800);
}
function updateEditorMeta() {
  const count = codeInput.value.split("\n").length;
  $("#lineNumbers").textContent = Array.from(
    { length: count },
    (_, index) => index + 1,
  ).join("\n");
  $("#lineCount").textContent = `${codeInput.value.length ? count : 0} lines`;
  $("#editorLanguage").textContent = languageSelect.value.toUpperCase();
  if (!lastFileName)
    $("#fileName").textContent =
      `untitled.${{ python: "py", cpp: "cpp", java: "java", javascript: "js" }[languageSelect.value] || "txt"}`;

  $("#lineNumbers").scrollTop = codeInput.scrollTop;
}
function loadSample() {
  codeInput.value = samples[languageSelect.value] || samples.python;
  errorInput.value = "";
  lastFileName = "";
  updateEditorMeta();
  toastMessage("Sample loaded. Run the analysis when you're ready.");
}
function showPanel(panel) {
  ["#emptyState", "#loadingState", "#errorState", "#results"].forEach((id) =>
    $(id).classList.add("hidden"),
  );
  $(panel).classList.remove("hidden");
}
function setStatus(text, ready = false) {
  $("#resultStatus").innerHTML = `<span class="waiting-dot"></span>${text}`;
  $("#resultStatus").classList.toggle("ready", ready);
}
function escapeHtml(value) {
  return String(value ?? "").replace(
    /[&<>"']/g,
    (char) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[char],
  );
}
function issueSeverityClass(severity) {
  return ["error", "warning", "info"].includes(severity) ? severity : "warning";
}
function renderDiagnostics(diagnostics = []) {
  const area = $("#diagnosticsArea");
  if (!diagnostics.length) {
    area.classList.add("hidden");
    area.innerHTML = "";
    return;
  }
  area.classList.remove("hidden");
  area.innerHTML = `<h4>Local static checks</h4>${diagnostics
    .map(
      (item) => `
    <div class="diagnostic"><strong>${escapeHtml(item.source_name || item.kind || "Checker")}</strong>
    ${item.line ? `<span>Line ${item.line}${item.column ? `, column ${item.column}` : ""}</span>` : ""}
    <pre>${escapeHtml(item.message || "")}</pre></div>`,
    )
    .join("")}`;
}
function renderIssues(issues = []) {
  $("#issueCount").textContent = issues.length;
  const list = $("#issuesList");
  if (!issues.length) {
    list.innerHTML = `<div class="no-issues"><span>✓</span><div><strong>No confirmed issue reported</strong><p>The analysis did not identify a specific bug. That does not prove the program is correct; run tests with representative inputs.</p></div></div>`;
    return;
  }
  list.innerHTML = issues
    .map((issue, index) => {
      const severity = issueSeverityClass(issue.severity);
      const location = issue.line
        ? `Line ${issue.line}${issue.column ? `, column ${issue.column}` : ""}`
        : "Location not confirmed";
      return `<article class="issue-card">
      <div class="issue-icon ${severity}">${severity === "error" ? "!" : severity === "warning" ? "△" : "i"}</div>
      <div class="issue-content"><div class="issue-title-row"><h5>${escapeHtml(issue.title || `Finding ${index + 1}`)}</h5><span class="severity-chip ${severity}">${severity}</span></div>
      <div class="issue-location">${escapeHtml(location)}</div><p>${escapeHtml(issue.explanation || "")}</p>
      ${issue.evidence ? `<div class="evidence"><span>Evidence</span><code>${escapeHtml(issue.evidence)}</code></div>` : ""}
      ${issue.fix ? `<div class="fix-hint"><strong>Suggested direction:</strong> ${escapeHtml(issue.fix)}</div>` : ""}</div>
    </article>`;
    })
    .join("");
}
function renderTests(tests = []) {
  const list = $("#testsList");
  if (!tests.length) {
    list.innerHTML = `<p class="empty-tests">No specific test was confidently generated. Try writing a test around the expected behavior.</p>`;
    return;
  }
  list.innerHTML = tests
    .map(
      (test, index) => `<div class="test-case">
    <div class="test-case-title"><strong>${index + 1}. ${escapeHtml(test.name || "Suggested test")}</strong><span class="not-run">NOT RUN</span></div>
    <div class="test-detail"><span>Input</span><code>${escapeHtml(test.input || "Not specified")}</code></div>
    <div class="test-detail"><span>Expected</span><code>${escapeHtml(test.expected || "Not specified")}</code></div>
    <div class="test-detail"><span>Actual</span><code>${escapeHtml(test.actual || "Needs execution")}</code></div>
  </div>`,
    )
    .join("");
}
function renderAnalysis(data) {
  lastAnalysis = data;
  showPanel("#results");
  setStatus("Analysis complete", true);
  const labels = {
    issue_found: "ISSUE FOUND",
    possible_issue: "POSSIBLE ISSUE",
    no_obvious_issue: "NO OBVIOUS ISSUE",
    needs_more_context: "NEEDS MORE CONTEXT",
  };
  $("#statusLabel").textContent = labels[data.status] || "ANALYSIS";
  $("#summaryText").textContent = data.summary || "Analysis completed.";
  $("#confidenceValue").textContent =
    `${Math.round((Number(data.confidence) || 0) * 100)}%`;
  renderDiagnostics(data.static_diagnostics || []);
  renderIssues(data.issues || []);
  renderTests(data.tests || []);
  $("#fixSummary").textContent =
    data.fix_summary || "No specific code correction was suggested.";
  $("#originalCode").textContent = codeInput.value;
  $("#fixedCode").textContent =
    data.corrected_code || "No corrected code suggested.";
  $("#applyFix").disabled = !data.corrected_code;
  const limitations = [...(data.limitations || [])];
  limitations.unshift(
    "CodeTrace has not executed your program. Test cases are suggestions, not verified results.",
  );
  $("#limitations").textContent = limitations.join(" ");
}
async function analyze() {
  const code = codeInput.value;
  if (!code.trim()) {
    toastMessage("Paste or upload source code first.");
    codeInput.focus();
    return;
  }
  analyzeBtn.disabled = true;
  analyzeBtn.innerHTML = "<span>✦</span> Analyzing…";
  setStatus("Analyzing");
  showPanel("#loadingState");
  try {
    const response = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code,
        error: errorInput.value,
        language: languageSelect.value,
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(
        data.error || "The server could not analyze this code.",
      );
      error.code = data.code;
      error.staticDiagnostics = data.static_diagnostics;
      throw error;
    }
    renderAnalysis(data);
    toastMessage("Analysis complete. Review the findings carefully.");
  } catch (error) {
    showPanel("#errorState");
    setStatus("Analysis failed");
    $("#errorMessage").textContent =
      error.message ||
      "Could not reach the server. Make sure Flask is running.";
    if (error.staticDiagnostics?.length) {
      $("#errorMessage").textContent +=
        " Local diagnostics were found, but AI analysis is unavailable.";
    }
  } finally {
    analyzeBtn.disabled = false;
    analyzeBtn.innerHTML =
      '<span>✦</span> Analyze my code <span class="button-arrow">→</span>';
  }
}
async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    toastMessage("Copied to clipboard.");
  } catch {
    toastMessage("Clipboard access is unavailable in this browser.");
  }
}

$("#loadExample").addEventListener("click", loadSample);
$("#clearError").addEventListener("click", () => {
  errorInput.value = "";
  errorInput.focus();
});
$("#analyzeBtn").addEventListener("click", analyze);
$("#retryBtn").addEventListener("click", analyze);
$("#copyOriginal").addEventListener("click", () =>
  copyText($("#originalCode").textContent),
);
$("#copyFix").addEventListener("click", () =>
  copyText($("#fixedCode").textContent),
);
$("#applyFix").addEventListener("click", () => {
  if (!lastAnalysis?.corrected_code) return;
  codeInput.value = lastAnalysis.corrected_code;
  lastFileName = "";
  updateEditorMeta();
  codeInput.focus();
  toastMessage(
    "Suggested code copied into the editor. Analyze it again to review.",
  );
});
$("#aboutButton").addEventListener("click", () => {
  alert(
    "CodeTrace uses an AI model to review code and suggest fixes. It does not execute submitted code. Findings and suggested tests may be incorrect, so verify them before relying on them.",
  );
});
codeInput.addEventListener("input", updateEditorMeta);
codeInput.addEventListener("scroll", () => {
  $("#lineNumbers").scrollTop = codeInput.scrollTop;
});
languageSelect.addEventListener("change", () => {
  lastFileName = "";
  updateEditorMeta();
});
codeInput.addEventListener("keydown", (event) => {
  if (event.key === "Tab") {
    event.preventDefault();
    codeInput.setRangeText(
      "    ",
      codeInput.selectionStart,
      codeInput.selectionEnd,
      "end",
    );
    updateEditorMeta();
  }
});
fileInput.addEventListener("change", async () => {
  const file = fileInput.files?.[0];
  if (!file) return;
  try {
    codeInput.value = await file.text();
    lastFileName = file.name;
    $("#fileName").textContent = file.name;
    const extension = file.name.split(".").pop().toLowerCase();
    if (extensions[extension]) languageSelect.value = extensions[extension];
    updateEditorMeta();
    $("#fileName").textContent = file.name;
    toastMessage(
      `${file.name} loaded. Add an error message only if you have one.`,
    );
  } catch {
    toastMessage("Could not read that file. Try a plain-text source file.");
  }
  fileInput.value = "";
});
async function checkHealth() {
  try {
    const response = await fetch("/api/health");
    const data = await response.json();
    if (data.ai_configured) {
      $("#checker").textContent = `AI connected · ${data.model}`;
      $("#healthDot").classList.add("online");
    } else {
      $("#checker").textContent = "API key needed";
      $("#healthDot").classList.add("offline");
      $("#checker").title =
        "Add OPENROUTER_API_KEY to .env to enable AI analysis.";
    }
  } catch {
    $("#checker").textContent = "Server unavailable";
    $("#healthDot").classList.add("offline");
  }
}
updateEditorMeta();
checkHealth();
