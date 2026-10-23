# CodeTrace: AI debugging assistant

CodeTrace is a Flask web application that reviews code, identifies likely bugs, explains findings in beginner-friendly language, suggests minimal tests, and can propose corrected code. The user does **not** have to supply a compiler/runtime error.

## Project structure

```text
CodeTrace_Full_Project/
├── app.py
├── requirements.txt
├── .env.example
├── .gitignore
├── templates/
│   └── index.html
└── static/
    ├── styles.css
    └── app.js
```

## Requirements

- Python 3.10 or newer
- An API key for the configured OpenAI model
- Internet access for the AI API request
- Optional: `gcc` or `g++` installed for compile-only checks of C/C++ source

The API key is not included. You must use your own key and keep it private.

## Setup on Windows PowerShell

Open a terminal inside the extracted project folder:

```powershell
py -m venv .venv
.venv\\Scripts\\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
```

Open `.env` in an editor and replace `your_api_key_here` with your own API key. Do not add quotation marks unless your provider requires them.

Then run:

```powershell
python app.py
```

Open `http://127.0.0.1:5000`.

## Setup on macOS / Linux

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

Edit `.env` to set your API key, then run:

```bash
python app.py
```

Open `http://127.0.0.1:5000`.

## What works

- Responsive CodeTrace dashboard.
- Code can be pasted or uploaded from a text source file.
- Optional error/traceback field.
- AI review for a broad range of languages, with structured findings, line references when possible, plain-language explanations, test suggestions, and suggested corrections.
- Python syntax parsing without running the program.
- Optional C/C++ compile-only checks if `python`, `gcc`, or `g++` are available as applicable.
- Original and suggested code displayed side by side.
- Copy code and load a suggested correction back into the editor.

## Important limitations and safety

- The AI is a general code reviewer, not a formal verifier. It may miss bugs, misunderstand intent, or suggest incorrect changes.
- Suggested test cases are **not executed**. The UI clearly labels them as not run.
- Code is sent to the configured AI provider for analysis. Do not paste passwords, API keys, private customer data, or confidential code unless you are authorized to do so.
- The app does not execute arbitrary submitted code. This is deliberate. Running untrusted code inside the Flask process would be unsafe.
- Compile-only checks are attempted only for C and C++ when a compiler is installed. They do not run the compiled program.
- HTML, CSS, SQL, and other languages receive AI-based review; language-specific static tools can be added later for stronger validation.
- Add authentication, rate limiting, monitoring, and appropriate deployment settings before exposing the service publicly.
- Keep `FLASK_DEBUG=0` outside local development and never expose `.env`.

## API

`POST /api/analyze`

JSON request:

```json
{
  "language": "python",
  "code": "def add(a, b):\\n    return a - b",
  "error": ""
}
```

The `error` field can be an empty string. The API returns a structured JSON analysis.

`GET /api/health` reports whether an API key is configured. It does not validate that the key is accepted by the provider.

## How the analysis works

1. The browser sends the source, selected language, and optional error to Flask.
2. Flask applies size limits and runs safe, local static checks where supported.
3. The backend asks the configured LLM for structured findings, explanations, suggested tests, and a possible correction.
4. The UI displays the results and labels test cases as suggestions, not verified execution.

## Recommended next stage

For verified fixes, add a separate, isolated code-runner service with language-specific containers, no network access, strict CPU/memory/time limits, read-only base filesystems, and per-run cleanup. Only then should the app report that a generated test actually passed or failed.
