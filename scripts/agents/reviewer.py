import os, subprocess, json, requests

# Minimal Agno reviewer agent for docs/*.md diffs.
try:
    from agno.agent import Agent
except Exception:
    # Fallback: define a stub that echoes
    class Agent:
        def __init__(self, **kwargs):
            pass
        def run(self, prompt: str):
            return f"[stub-reviewer] {prompt[:200]}..."

REPO = os.getenv("GITHUB_REPOSITORY", "")
GITHUB_TOKEN = os.getenv("GITHUB_TOKEN", "")

def get_pr_number() -> str:
    # Try to infer PR number from environment (GITHUB_REF or event payload)
    ref = os.getenv("GITHUB_REF", "") or os.getenv("GITHUB_REF_NAME", "")
    if ref.startswith("refs/pull/"):
        parts = ref.split("/")
        if len(parts) >= 3:
            return parts[2]
    # Fallback to event
    event_path = os.getenv("GITHUB_EVENT_PATH")
    if event_path and os.path.exists(event_path):
        try:
            with open(event_path, "r") as f:
                event = json.load(f)
            pr = event.get("pull_request", {})
            number = pr.get("number")
            if number:
                return str(number)
        except Exception:
            pass
    return ""

def get_changed_docs() -> list:
    try:
        base = subprocess.check_output(["git", "merge-base", "origin/main", "HEAD"]).decode().strip()
    except Exception:
        base = "HEAD~1"
    out = subprocess.check_output(["git", "diff", "--name-only", base, "HEAD"]).decode().splitlines()
    return [p for p in out if p.startswith("docs/") and p.endswith(".md")]

def load_file(path: str) -> str:
    try:
        with open(path, "r", encoding="utf-8") as f:
            return f.read()
    except Exception:
        return ""

system_prompt = (
    "You are a senior API documentation reviewer.\n"
    "Enforce: intro section, endpoint summary table, request/response examples, auth, rate limits, errors.\n"
    "Ensure examples match parameters and schemas. Suggest minimal diffs using fenced code blocks.\n"
)

agent = Agent(name="DocsReviewer", role="Documentation reviewer", markdown=True)

def post_review(pr_number: str, comments: list[str]):
    if not (REPO and GITHUB_TOKEN and pr_number):
        return
    url = f"https://api.github.com/repos/{REPO}/pulls/{pr_number}/reviews"
    headers = {"Authorization": f"token {GITHUB_TOKEN}", "Accept": "application/vnd.github+json"}
    body = {
        "event": "COMMENT",
        "body": "Automated documentation review suggestions:\n\n" + "\n\n".join(comments),
    }
    r = requests.post(url, headers=headers, data=json.dumps(body), timeout=20)
    if r.status_code >= 300:
        print("Reviewer post failed:", r.status_code, r.text)

def main():
    pr_number = get_pr_number()
    changed = get_changed_docs()
    if not changed:
        print("No changed docs; reviewer exiting.")
        return
    comments: list[str] = []
    for path in changed:
        content = load_file(path)
        prompt = f"File: {path}\n\n{content}\n\nProvide specific, actionable improvements as GitHub Markdown diffs."
        try:
            critique = agent.run(prompt)
        except Exception as e:
            critique = f"[review error: {e}]"
        comments.append(f"### {path}\n\n{critique}")
    if comments and pr_number:
        post_review(pr_number, comments)
    else:
        print("No comments to post or PR number missing.")

if __name__ == "__main__":
    main()

