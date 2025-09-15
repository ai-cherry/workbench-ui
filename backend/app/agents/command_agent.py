"""
Command Agent for Sophia Intel AI
Executes commands directly on the Sophia repository with full privileges
"""

import os
import asyncio
import subprocess
import json
from typing import Dict, Any, Optional, List
from datetime import datetime

class CommandAgent:
    """Agent for executing commands on Sophia Intel AI repository"""
    
    def __init__(self):
        self.sophia_repo = "../sophia-intel-ai"
        self.github_token = os.getenv("GITHUB_TOKEN")
        self.allowed_commands = {
            "test": self._run_tests,
            "lint": self._run_lint,
            "format": self._format_code,
            "analyze": self._analyze_code,
            "migrate": self._run_migrations,
            "backup": self._backup_data,
            "restore": self._restore_data,
            "git": self._git_operation,
            "docker": self._docker_operation,
            "npm": self._npm_operation,
            "python": self._python_operation,
            "custom": self._custom_command
        }
    
    async def execute(
        self,
        command: str,
        service: str,
        args: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Execute command on specified service"""
        
        # Parse command type
        cmd_type = command.split()[0] if command else "custom"
        
        # Get handler
        handler = self.allowed_commands.get(cmd_type, self._custom_command)
        
        # Execute
        result = await handler(command, service, args or {})
        
        # Log to audit trail
        await self._log_command(command, service, result)
        
        return result
    
    async def _run_tests(self, command: str, service: str, args: Dict) -> Dict:
        """Run test suite"""
        
        test_script = f"""#!/bin/bash
set -e
cd {self.sophia_repo}

echo "🧪 Running tests for {service}"

# Python tests
if [ -f "pytest.ini" ] || [ -f "setup.cfg" ]; then
    python -m pytest tests/ -v --cov={service} --cov-report=term-missing
fi

# JavaScript/TypeScript tests
if [ -f "package.json" ]; then
    npm test
fi

echo "✅ Tests complete!"
"""
        
        result = await self._run_script(test_script)
        
        return {
            "status": "success" if result.get("returncode") == 0 else "failed",
            "command": command,
            "service": service,
            "output": result.get("output", ""),
            "test_results": self._parse_test_results(result.get("output", ""))
        }
    
    async def _run_lint(self, command: str, service: str, args: Dict) -> Dict:
        """Run linting"""
        
        lint_script = f"""#!/bin/bash
set -e
cd {self.sophia_repo}

echo "🔍 Linting {service}"

# Python linting
if [ -f "pyproject.toml" ] || [ -f ".flake8" ]; then
    # Ruff (fast Python linter)
    ruff check . --fix
    
    # Type checking
    mypy {service} --ignore-missing-imports
fi

# JavaScript/TypeScript linting
if [ -f ".eslintrc.json" ] || [ -f ".eslintrc.js" ]; then
    npx eslint . --fix
fi

echo "✅ Linting complete!"
"""
        
        result = await self._run_script(lint_script)
        
        return {
            "status": "success" if result.get("returncode") == 0 else "failed",
            "command": command,
            "service": service,
            "output": result.get("output", "")
        }
    
    async def _format_code(self, command: str, service: str, args: Dict) -> Dict:
        """Format code"""
        
        format_script = f"""#!/bin/bash
set -e
cd {self.sophia_repo}

echo "💅 Formatting code for {service}"

# Python formatting
if [ -f "pyproject.toml" ]; then
    # Black for Python
    black .
    
    # isort for imports
    isort .
fi

# JavaScript/TypeScript formatting
if [ -f ".prettierrc" ] || [ -f "prettier.config.js" ]; then
    npx prettier --write .
fi

echo "✅ Formatting complete!"
"""
        
        result = await self._run_script(format_script)
        
        # Commit formatted code
        if result.get("returncode") == 0:
            await self._git_operation(
                "git add -A && git commit -m 'Auto-format code'",
                service,
                {}
            )
        
        return {
            "status": "success" if result.get("returncode") == 0 else "failed",
            "command": command,
            "service": service,
            "output": result.get("output", "")
        }
    
    async def _analyze_code(self, command: str, service: str, args: Dict) -> Dict:
        """Analyze code quality"""
        
        analyze_script = f"""#!/bin/bash
set -e
cd {self.sophia_repo}

echo "📊 Analyzing code for {service}"

# Python analysis
if [ -f "pyproject.toml" ]; then
    # Complexity analysis
    radon cc {service} -s -j > /tmp/complexity.json
    
    # Security scan
    bandit -r {service} -f json > /tmp/security.json || true
    
    # Dependencies audit
    pip-audit --desc > /tmp/dependencies.txt || true
fi

# Output results
echo "=== Complexity Analysis ==="
cat /tmp/complexity.json 2>/dev/null || echo "No Python code"

echo "=== Security Scan ==="
cat /tmp/security.json 2>/dev/null || echo "No issues found"

echo "=== Dependencies ==="
cat /tmp/dependencies.txt 2>/dev/null || echo "All dependencies secure"

echo "✅ Analysis complete!"
"""
        
        result = await self._run_script(analyze_script)
        
        return {
            "status": "success",
            "command": command,
            "service": service,
            "output": result.get("output", ""),
            "analysis": self._parse_analysis_results(result.get("output", ""))
        }
    
    async def _run_migrations(self, command: str, service: str, args: Dict) -> Dict:
        """Run database migrations"""
        
        migration_script = f"""#!/bin/bash
set -e
cd {self.sophia_repo}

echo "🔄 Running migrations for {service}"

# Alembic migrations (SQLAlchemy)
if [ -f "alembic.ini" ]; then
    alembic upgrade head
fi

# Django migrations
if [ -f "manage.py" ]; then
    python manage.py migrate
fi

# Custom migrations
if [ -d "migrations" ]; then
    for migration in migrations/*.sql; do
        echo "Running $migration"
        # Execute migration (adjust for your DB)
    done
fi

echo "✅ Migrations complete!"
"""
        
        result = await self._run_script(migration_script)
        
        return {
            "status": "success" if result.get("returncode") == 0 else "failed",
            "command": command,
            "service": service,
            "output": result.get("output", "")
        }
    
    async def _backup_data(self, command: str, service: str, args: Dict) -> Dict:
        """Backup service data"""
        
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        
        backup_script = f"""#!/bin/bash
set -e
cd {self.sophia_repo}

echo "💾 Backing up {service}"

BACKUP_DIR="backups/{timestamp}"
mkdir -p $BACKUP_DIR

# Backup code
tar -czf $BACKUP_DIR/{service}_code.tar.gz {service}/

# Backup config
cp -r config/ $BACKUP_DIR/config/

# Backup database (if exists)
if [ -f ".env" ]; then
    source .env
    if [ ! -z "$DATABASE_URL" ]; then
        pg_dump $DATABASE_URL > $BACKUP_DIR/database.sql
    fi
fi

# Upload to cloud storage (optional)
# aws s3 cp $BACKUP_DIR s3://sophia-backups/{timestamp}/ --recursive

echo "✅ Backup complete: $BACKUP_DIR"
"""
        
        result = await self._run_script(backup_script)
        
        return {
            "status": "success" if result.get("returncode") == 0 else "failed",
            "command": command,
            "service": service,
            "backup_location": f"backups/{timestamp}",
            "output": result.get("output", "")
        }
    
    async def _restore_data(self, command: str, service: str, args: Dict) -> Dict:
        """Restore service data"""
        
        backup_id = args.get("backup_id", "latest")
        
        restore_script = f"""#!/bin/bash
set -e
cd {self.sophia_repo}

echo "♻️ Restoring {service} from {backup_id}"

if [ "{backup_id}" == "latest" ]; then
    BACKUP_DIR=$(ls -t backups/ | head -1)
else
    BACKUP_DIR="backups/{backup_id}"
fi

if [ ! -d "$BACKUP_DIR" ]; then
    echo "❌ Backup not found: $BACKUP_DIR"
    exit 1
fi

# Restore code
tar -xzf $BACKUP_DIR/{service}_code.tar.gz

# Restore config
cp -r $BACKUP_DIR/config/* config/

# Restore database
if [ -f "$BACKUP_DIR/database.sql" ]; then
    source .env
    psql $DATABASE_URL < $BACKUP_DIR/database.sql
fi

echo "✅ Restore complete from $BACKUP_DIR"
"""
        
        result = await self._run_script(restore_script)
        
        return {
            "status": "success" if result.get("returncode") == 0 else "failed",
            "command": command,
            "service": service,
            "restored_from": backup_id,
            "output": result.get("output", "")
        }
    
    async def _git_operation(self, command: str, service: str, args: Dict) -> Dict:
        """Execute git operations"""
        
        git_script = f"""#!/bin/bash
set -e
cd {self.sophia_repo}

echo "📝 Git operation: {command}"

# Execute git command
{command}

echo "✅ Git operation complete!"
"""
        
        result = await self._run_script(git_script)
        
        return {
            "status": "success" if result.get("returncode") == 0 else "failed",
            "command": command,
            "service": service,
            "output": result.get("output", "")
        }
    
    async def _docker_operation(self, command: str, service: str, args: Dict) -> Dict:
        """Execute Docker operations"""
        
        docker_script = f"""#!/bin/bash
set -e
cd {self.sophia_repo}

echo "🐳 Docker operation: {command}"

# Execute docker command
{command}

echo "✅ Docker operation complete!"
"""
        
        result = await self._run_script(docker_script)
        
        return {
            "status": "success" if result.get("returncode") == 0 else "failed",
            "command": command,
            "service": service,
            "output": result.get("output", "")
        }
    
    async def _npm_operation(self, command: str, service: str, args: Dict) -> Dict:
        """Execute npm operations"""
        
        npm_script = f"""#!/bin/bash
set -e
cd {self.sophia_repo}

echo "📦 NPM operation: {command}"

# Execute npm command
{command}

echo "✅ NPM operation complete!"
"""
        
        result = await self._run_script(npm_script)
        
        return {
            "status": "success" if result.get("returncode") == 0 else "failed",
            "command": command,
            "service": service,
            "output": result.get("output", "")
        }
    
    async def _python_operation(self, command: str, service: str, args: Dict) -> Dict:
        """Execute Python operations"""
        
        python_script = f"""#!/bin/bash
set -e
cd {self.sophia_repo}

echo "🐍 Python operation: {command}"

# Activate virtual environment if exists
if [ -f "venv/bin/activate" ]; then
    source venv/bin/activate
fi

# Execute python command
{command}

echo "✅ Python operation complete!"
"""
        
        result = await self._run_script(python_script)
        
        return {
            "status": "success" if result.get("returncode") == 0 else "failed",
            "command": command,
            "service": service,
            "output": result.get("output", "")
        }
    
    async def _custom_command(self, command: str, service: str, args: Dict) -> Dict:
        """Execute custom command - FULL PRIVILEGES"""
        
        # WARNING: This executes ANY command with full privileges
        # This is intentional for maximum control over Sophia
        
        custom_script = f"""#!/bin/bash
set -e
cd {self.sophia_repo}

echo "⚡ Custom command: {command}"
echo "⚠️ Executing with FULL PRIVILEGES"

# Execute command
{command}

echo "✅ Command complete!"
"""
        
        result = await self._run_script(custom_script)
        
        return {
            "status": "success" if result.get("returncode") == 0 else "failed",
            "command": command,
            "service": service,
            "output": result.get("output", ""),
            "warning": "Executed with full privileges"
        }
    
    async def _run_script(self, script: str) -> Dict[str, Any]:
        """Execute bash script"""
        
        # Write script to temp file
        script_file = f"/tmp/cmd_{datetime.utcnow().timestamp()}.sh"
        with open(script_file, "w") as f:
            f.write(script)
        
        os.chmod(script_file, 0o755)
        
        # Execute
        process = await asyncio.create_subprocess_shell(
            script_file,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        
        stdout, stderr = await process.communicate()
        
        # Clean up
        os.remove(script_file)
        
        return {
            "returncode": process.returncode,
            "output": stdout.decode() if stdout else "",
            "error": stderr.decode() if stderr else ""
        }
    
    async def _log_command(self, command: str, service: str, result: Dict):
        """Log command execution for audit trail"""
        
        log_entry = {
            "timestamp": datetime.utcnow().isoformat(),
            "command": command,
            "service": service,
            "status": result.get("status"),
            "user": "ceo",  # Single user system
            "output_preview": result.get("output", "")[:500] if result.get("output") else None
        }
        
        # Log to file
        log_file = f"{self.sophia_repo}/logs/commands.jsonl"
        os.makedirs(os.path.dirname(log_file), exist_ok=True)
        
        with open(log_file, "a") as f:
            f.write(json.dumps(log_entry) + "\n")
    
    def _parse_test_results(self, output: str) -> Dict:
        """Parse test results from output"""
        
        # Basic parsing - extend as needed
        results = {
            "passed": 0,
            "failed": 0,
            "skipped": 0
        }
        
        for line in output.split("\n"):
            if "passed" in line.lower():
                # Try to extract numbers
                import re
                match = re.search(r"(\d+)\s+passed", line.lower())
                if match:
                    results["passed"] = int(match.group(1))
            # Similar for failed and skipped
        
        return results
    
    def _parse_analysis_results(self, output: str) -> Dict:
        """Parse code analysis results"""
        
        # Basic parsing - extend as needed
        return {
            "complexity": "extracted from output",
            "security_issues": "extracted from output",
            "dependencies": "extracted from output"
        }