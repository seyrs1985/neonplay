#!/usr/bin/env bash
# NeonPlay one-command deploy:
#   build -> git commit -> create repo (first run) -> enable GitHub Pages -> push -> wait live -> IndexNow
#
# Credentials: GITHUB_TOKEN env or `git config tooltide.token` (same PAT as ToolTide).
set -euo pipefail
cd "$(dirname "$0")/.."          # project root (game-arcade)

export http_proxy="${http_proxy:-http://127.0.0.1:7890}"
export https_proxy="${https_proxy:-http://127.0.0.1:7890}"

OWNER="$(git config --get tooltide.owner || git config --global user.name | tr -d '[:space:]')"
REPO="neonplay"
URL="https://${OWNER}.github.io/${REPO}/"
API="https://api.github.com"

echo "== 1/6 build =="
python engine/build.py | tail -1

echo "== 2/6 git repository =="
if [ ! -d .git ]; then
  git init -b main -q
fi
cat > .gitignore <<'EOF'
__pycache__/
*.pyc
EOF
git add -A
git -c core.hooksPath=/dev/null commit -q -m "deploy: $(date -u '+%Y-%m-%d %H:%M UTC')" --allow-empty || true

echo "== 3/6 credentials =="
export GIT_TERMINAL_PROMPT=0 GCM_INTERACTIVE=never GCM_GUI_PROMPT=never
TOKEN="${GITHUB_TOKEN:-}"
if [ -z "$TOKEN" ]; then
  TOKEN="$(git config --get tooltide.token || true)"
fi
if [ -z "$TOKEN" ]; then
  echo "  ✗ 未找到 GitHub token(仅首次需要): GITHUB_TOKEN=ghp_xxx bash engine/deploy.sh"
  exit 2
fi


# ---- 多进程部署互斥锁(原子mkdir锁, 30分钟超时自动接管) ----
LOCK_DIR=".deploy.lock"
acquire_lock(){
  if mkdir "$LOCK_DIR" 2>/dev/null; then echo "$$" > "$LOCK_DIR/pid"; return 0; fi
  local mt
  mt=$(stat -c %Y "$LOCK_DIR" 2>/dev/null || stat -f %m "$LOCK_DIR" 2>/dev/null || echo 0)
  local age=$(( $(date +%s) - mt ))
  if [ "$age" -gt 1800 ]; then
    echo "   ⚠ 发现超时锁(${age}s), 判定为崩溃残留, 强制接管"
    rm -rf "$LOCK_DIR"; mkdir "$LOCK_DIR" 2>/dev/null && { echo "$$" > "$LOCK_DIR/pid"; return 0; }
  fi
  return 1
}
release_lock(){
  # 只释放自己持有的锁(跳过路径不得误删他人锁)
  if [ -f "$LOCK_DIR/pid" ] && [ "$(cat "$LOCK_DIR/pid" 2>/dev/null)" = "$$" ]; then
    rm -rf "$LOCK_DIR" 2>/dev/null
  fi
}
trap 'release_lock' EXIT
if ! acquire_lock; then
  echo "   ⏳ 另一个部署进程持有锁, 等待最多3分钟..."
  for i in $(seq 1 12); do
    sleep 15
    if acquire_lock; then ok=1; break; fi
  done
  if [ "${ok:-0}" != "1" ]; then
    echo "   ⏭ 锁持续被占(>3分钟), 本轮部署跳过(内容已保留在本地, 下轮自动重试)"
    exit 0
  fi
fi
# ---- 同步远端(防止其他进程先推送) ----
echo "== 0/6 同步远端 =="
git -c credential.helper= pull --rebase "https://x-access-token:${TOKEN}@github.com/${OWNER}/${REPO}.git" main 2>/dev/null ||   git pull --rebase 2>/dev/null || echo "   (远端同步跳过)"

echo "== 4/6 GitHub repo =="
code="$(curl -s -o /tmp/np_repo.json -w '%{http_code}' -X POST "$API/user/repos" \
  -H "Authorization: token $TOKEN" -H 'Accept: application/vnd.github+json' \
  -d "{\"name\":\"$REPO\",\"description\":\"Free online games - arcade, puzzle and classics\",\"has_wiki\":false,\"has_projects\":false,\"has_issues\":true,\"auto_init\":false}")"
case "$code" in
  201) echo "   repo created: $OWNER/$REPO" ;;
  422) echo "   repo already exists" ;;
  401) echo "   ✗ token 无效或过期 (401)"; exit 3 ;;
  *)   echo "   ✗ 创建 repo 失败 HTTP $code: $(cat /tmp/np_repo.json | head -c 300)"; exit 3 ;;
esac

echo "== 5/6 push =="
git -c credential.helper= fetch -q "https://x-access-token:${TOKEN}@github.com/${OWNER}/${REPO}.git" main 2>/dev/null || true
git -c core.hooksPath=/dev/null rebase --autostash FETCH_HEAD 2>/dev/null || { git rebase --abort 2>/dev/null || true; }
git -c credential.helper= push -q "https://x-access-token:${TOKEN}@github.com/${OWNER}/${REPO}.git" main
echo "   pushed main -> github.com/$OWNER/$REPO"

echo "== 6/6 Pages + wait for live + IndexNow =="
pcode="$(curl -s -o /tmp/np_pages.json -w '%{http_code}' -X POST "$API/repos/$OWNER/$REPO/pages" \
  -H "Authorization: token $TOKEN" -H 'Accept: application/vnd.github+json' \
  -d '{"source":{"branch":"main","path":"/docs"}}')"
case "$pcode" in
  201) echo "   Pages enabled from /docs" ;;
  409) echo "   Pages already enabled" ;;
  *)   echo "   ⚠ Pages API HTTP $pcode: $(head -c 200 /tmp/np_pages.json)" ;;
esac
live=0
for i in $(seq 1 24); do
  http="$(curl -s -o /dev/null -w '%{http_code}' -m 10 "$URL" || true)"
  if [ "$http" = "200" ]; then live=1; break; fi
  sleep 5
done
if [ "$live" = 1 ]; then
  echo "   ✅ 站点已上线: $URL"
else
  echo "   ⚠ 首次 Pages 构建可能需要几分钟,稍后手动检查: $URL"
fi

python engine/ping_indexnow.py || true
echo "done."
