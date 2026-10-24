# CodeTrace

CodeTrace is a web app that reviews your code with AI, finds likely bugs, explains them in plain English, and suggests a fix. You don't need an error message to use it.

Supported languages: Python, C++, Java, JavaScript (anything else can be reviewed as "Other").

## Why it's useful

- Finds likely bugs even when your code runs without errors.
- Explains why something is wrong, so you learn instead of just copying a fix.
- Suggests test cases and shows the original and corrected code side by side.

## Setup on Windows

Run these in PowerShell.

**Install Python**

```powershell
winget install -e --id Python.Python.3.12
```

**Install dependencies**

```powershell
py -m venv .venv
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

**Add your API key**

Get a key from https://openrouter.ai/keys, then:

```powershell
Copy-Item .env.example .env
notepad .env
```

Set `OPENROUTER_API_KEY=` to your key and save.

**Run**

```powershell
python app.py
```

Open http://127.0.0.1:5000 in your browser.

# Team Members

**Nandish Mehra**   
**Mahendra Kala**  
**Premkumar Rahangdale** 
