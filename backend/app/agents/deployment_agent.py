"""
Deployment Agent for Sophia Intel AI
Handles all deployment operations to Fly.io and infrastructure management
"""

import os
import asyncio
import subprocess
import json
from typing import Dict, Any, Optional
from datetime import datetime

class DeploymentAgent:
    """Agent for deploying Sophia Intel AI services"""
    
    def __init__(self):
        self.fly_token = os.getenv("FLY_API_TOKEN")
        self.github_token = os.getenv("GITHUB_TOKEN")
        self.sophia_repo = "../sophia-intel-ai"
    
    async def deploy(
        self,
        target: str,
        service: str,
        version: str = "latest",
        rollback: bool = False
    ) -> Dict[str, Any]:
        """Deploy service to Fly.io"""
        
        if rollback:
            return await self._rollback(service)
        
        # Build and deploy
        deployment_id = f"deploy-{service}-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"
        
        try:
            # Create deployment script
            deploy_script = f"""#!/bin/bash
set -e

echo "🚀 Starting deployment {deployment_id}"
cd {self.sophia_repo}

# Build Docker image
echo "📦 Building Docker image..."
docker build -t sophia-{service}:{version} -f docker/{service}.Dockerfile .

# Tag for Fly.io registry
echo "🏷️ Tagging for Fly.io..."
docker tag sophia-{service}:{version} registry.fly.io/sophia-{service}:{version}

# Authenticate with Fly.io
echo "🔐 Authenticating with Fly.io..."
fly auth token {self.fly_token}

# Push to Fly.io registry
echo "⬆️ Pushing to registry..."
fly deploy --app sophia-{service}-{target} \\
    --image registry.fly.io/sophia-{service}:{version} \\
    --strategy rolling \\
    --wait-timeout 300

# Health check
echo "✅ Checking deployment health..."
fly status --app sophia-{service}-{target}

echo "✨ Deployment {deployment_id} complete!"
"""
            
            # Execute deployment
            result = await self._run_script(deploy_script)
            
            # Get deployment URL
            url = f"https://sophia-{service}-{target}.fly.dev"
            
            # Log deployment to GitHub
            await self._log_deployment_to_github(
                deployment_id,
                service,
                target,
                version,
                url
            )
            
            return {
                "status": "success",
                "deployment_id": deployment_id,
                "url": url,
                "logs": result.get("output", "").split("\n"),
                "version": version,
                "target": target
            }
            
        except Exception as e:
            return {
                "status": "error",
                "deployment_id": deployment_id,
                "error": str(e),
                "logs": [f"Deployment failed: {str(e)}"]
            }
    
    async def _rollback(self, service: str) -> Dict[str, Any]:
        """Rollback to previous version"""
        
        rollback_script = f"""#!/bin/bash
set -e

echo "⏮️ Starting rollback for {service}"
cd {self.sophia_repo}

# Get previous release
PREV_RELEASE=$(fly releases --app sophia-{service} --json | jq -r '.[1].version')

if [ -z "$PREV_RELEASE" ]; then
    echo "❌ No previous release found"
    exit 1
fi

echo "🔄 Rolling back to version $PREV_RELEASE"
fly deploy --app sophia-{service} --image-label v$PREV_RELEASE

echo "✅ Rollback complete!"
fly status --app sophia-{service}
"""
        
        result = await self._run_script(rollback_script)
        
        return {
            "status": "success" if result.get("returncode") == 0 else "error",
            "operation": "rollback",
            "service": service,
            "logs": result.get("output", "").split("\n")
        }
    
    async def _run_script(self, script: str) -> Dict[str, Any]:
        """Execute bash script"""
        
        # Write script to temp file
        script_file = f"/tmp/deploy_{datetime.utcnow().timestamp()}.sh"
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
    
    async def _log_deployment_to_github(
        self,
        deployment_id: str,
        service: str,
        target: str,
        version: str,
        url: str
    ):
        """Create GitHub deployment record"""
        
        import httpx
        
        async with httpx.AsyncClient() as client:
            # Create deployment
            response = await client.post(
                "https://api.github.com/repos/payready/sophia-intel-ai/deployments",
                headers={
                    "Authorization": f"token {self.github_token}",
                    "Accept": "application/vnd.github.v3+json"
                },
                json={
                    "ref": version if version != "latest" else "main",
                    "task": "deploy",
                    "auto_merge": False,
                    "required_contexts": [],
                    "payload": {
                        "service": service,
                        "target": target,
                        "deployment_id": deployment_id
                    },
                    "environment": target,
                    "description": f"Deploy {service} to {target}",
                    "production_environment": target == "production"
                }
            )
            
            if response.status_code == 201:
                deployment = response.json()
                
                # Create deployment status
                await client.post(
                    f"https://api.github.com/repos/payready/sophia-intel-ai/deployments/{deployment['id']}/statuses",
                    headers={
                        "Authorization": f"token {self.github_token}",
                        "Accept": "application/vnd.github.v3+json"
                    },
                    json={
                        "state": "success",
                        "target_url": url,
                        "description": f"Deployment {deployment_id} completed",
                        "environment": target,
                        "environment_url": url,
                        "auto_inactive": False
                    }
                )
    
    async def scale(self, service: str, count: int) -> Dict[str, Any]:
        """Scale service instances"""
        
        scale_script = f"""#!/bin/bash
set -e

echo "⚖️ Scaling {service} to {count} instances"
fly scale count {count} --app sophia-{service}

echo "✅ Scale operation complete!"
fly status --app sophia-{service}
"""
        
        result = await self._run_script(scale_script)
        
        return {
            "status": "success" if result.get("returncode") == 0 else "error",
            "service": service,
            "count": count,
            "logs": result.get("output", "").split("\n")
        }
    
    async def provision_infrastructure(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """Provision new infrastructure on Fly.io"""
        
        app_name = config.get("app_name")
        region = config.get("region", "sjc")  # Default to San Jose
        
        provision_script = f"""#!/bin/bash
set -e

echo "🏗️ Provisioning infrastructure for {app_name}"

# Create Fly app
fly apps create {app_name} --org payready

# Allocate shared IPv4
fly ips allocate-v4 --shared --app {app_name}

# Create volume for persistent storage
fly volumes create data --app {app_name} --region {region} --size 10

# Set secrets
fly secrets set \\
    DATABASE_URL="${{DATABASE_URL}}" \\
    REDIS_URL="${{REDIS_URL}}" \\
    --app {app_name}

echo "✅ Infrastructure provisioned!"
"""
        
        result = await self._run_script(provision_script)
        
        return {
            "status": "success" if result.get("returncode") == 0 else "error",
            "app_name": app_name,
            "region": region,
            "logs": result.get("output", "").split("\n")
        }