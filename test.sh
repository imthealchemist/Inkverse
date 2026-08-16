#!/bin/bash
# InkVerse API smoke test
BASE=${BASE:-http://localhost:3000}
B=$BASE/api
j() { python3 -c "import sys,json;d=json.load(sys.stdin);print(d$1)" 2>/dev/null; }
pass=0; fail=0
chk(){ if [ "$2" = "$3" ]; then pass=$((pass+1)); else fail=$((fail+1)); echo "FAIL: $1 (got '$2', want '$3')"; fi }

# 1. health & meta
chk "health" "$(curl -s $B/health | j "['ok']")" "True"
chk "genres count" "$(curl -s $B/genres | j "['genres'].__len__()")" "12"

# 2. home feed (anon)
H=$(curl -s $B/novels/home)
chk "featured>=3" "$(echo "$H" | j "['featured'].__len__()>=3")" "True"
chk "latest>0" "$(echo "$H" | j "['latest'].__len__()>0")" "True"

# 3. signup + duplicate guard
S=$(curl -s -X POST $B/auth/signup -H 'Content-Type: application/json' -d '{"name":"Test User","email":"test@t.com","password":"secret1"}')
TOK=$(echo "$S" | j "['token']")
chk "signup role" "$(echo "$S" | j "['user']['role']")" "reader"
DUP=$(curl -s -X POST $B/auth/signup -H 'Content-Type: application/json' -d '{"name":"Test User","email":"test@t.com","password":"secret1"}')
chk "duplicate email blocked" "$(echo "$DUP" | j "['error']")" "An account with this email already exists"

# 4. logins
RT=$(curl -s -X POST $B/auth/login -H 'Content-Type: application/json' -d '{"email":"reader@demo.app","password":"demo123"}' | j "['token']")
WT=$(curl -s -X POST $B/auth/login -H 'Content-Type: application/json' -d '{"email":"writer@demo.app","password":"demo123"}' | j "['token']")
AT=$(curl -s -X POST $B/auth/login -H 'Content-Type: application/json' -d '{"email":"admin@demo.app","password":"demo123"}' | j "['token']")
chk "bad password" "$(curl -s -X POST $B/auth/login -H 'Content-Type: application/json' -d '{"email":"reader@demo.app","password":"wrong"}' | j "['error']")" "Invalid email or password"

# 5. search & browse
chk "search title" "$(curl -s "$B/novels?q=embers" | j "['novels'][0]['title']")" "Embers of the Heart"
chk "search author" "$(curl -s "$B/novels?q=sterling" | j "['novels'].__len__()>=2")" "True"
chk "browse genre" "$(curl -s "$B/novels?genre=Comedy" | j "['novels'][0]['title']")" "My Roommate Is a Dragon"

# 6. reader: bookmark, history, follow, report
NID=$(curl -s "$B/novels?q=crown" | j "['novels'][0]['id']")
chk "bookmark on" "$(curl -s -X POST $B/novels/$NID/bookmark -H "Authorization: Bearer $RT" | j "['bookmarked']")" "True"
chk "bookmark off" "$(curl -s -X POST $B/novels/$NID/bookmark -H "Authorization: Bearer $RT" | j "['bookmarked']")" "False"
ZID=$(curl -s "$B/novels?q=sands" | j "['novels'][0]['authorId']")
chk "unfollow (already following)" "$(curl -s -X POST $B/users/$ZID/follow -H "Authorization: Bearer $RT" | j "['following']")" "False"
chk "follow" "$(curl -s -X POST $B/users/$ZID/follow -H "Authorization: Bearer $RT" | j "['following']")" "True"
chk "report" "$(curl -s -X POST $B/reports -H "Authorization: Bearer $RT" -H 'Content-Type: application/json' -d "{\"type\":\"novel\",\"targetId\":\"$NID\",\"reason\":\"test report\"}" | j "['ok']")" "True"

# 7. writer flow: create novel, draft chapter, publish
NN=$(curl -s -X POST $B/novels -H "Authorization: Bearer $WT" -H 'Content-Type: application/json' -d '{"title":"Test Novel API","description":"testing","genres":["Fantasy","Drama"],"cover":""}')
NNID=$(echo "$NN" | j "['novel']['id']")
chk "novel created" "$(echo "$NN" | j "['novel']['title']")" "Test Novel API"
CH=$(curl -s -X POST $B/novels/$NNID/chapters -H "Authorization: Bearer $WT" -H 'Content-Type: application/json' -d '{"title":"Ch One","content":"<p>Hello world of words.</p>","status":"draft"}')
CHID=$(echo "$CH" | j "['chapter']['id']")
chk "draft created" "$(echo "$CH" | j "['chapter']['status']")" "draft"
chk "wc=4" "$(echo "$CH" | j "['chapter']['wordCount']")" "4"
chk "publish" "$(curl -s -X PUT $B/chapters/$CHID -H "Authorization: Bearer $WT" -H 'Content-Type: application/json' -d '{"status":"published"}' | j "['chapter']['status']")" "published"
chk "draft hidden from anon" "$(curl -s $B/novels/$NNID | j "['chapters'].__len__()")" "1"
# reader cannot write
chk "reader blocked from creating novel" "$(curl -s -X POST $B/novels -H "Authorization: Bearer $RT" -H 'Content-Type: application/json' -d '{"title":"x"}' | j "['error']")" "A writer account is required"

# 8. chapter read endpoint + history
CHREAD=$(curl -s $B/chapters/$CHID -H "Authorization: Bearer $RT")
chk "chapter num" "$(echo "$CHREAD" | j "['num']")" "1"
chk "history record" "$(curl -s -X POST $B/me/history -H "Authorization: Bearer $RT" -H 'Content-Type: application/json' -d "{\"novelId\":\"$NNID\",\"chapterId\":\"$CHID\"}" | j "['ok']")" "True"
chk "library has history" "$(curl -s $B/me/library -H "Authorization: Bearer $RT" | j "['history'][0]['novel']['id']")" "$NNID"

# 9. writer join
chk "join writer" "$(curl -s -X POST $B/writer/join -H "Authorization: Bearer $TOK" | j "['user']['role']")" "writer"

# 10. verification flow: request -> admin approves
VT=$(curl -s -X POST $B/auth/login -H 'Content-Type: application/json' -d '{"email":"test@t.com","password":"secret1"}' | j "['token']")
chk "verification request" "$(curl -s -X POST $B/writer/verification -H "Authorization: Bearer $VT" -H 'Content-Type: application/json' -d '{"message":"Please verify my account, I have published work."}' | j "['ok']")" "True"
VID=$(curl -s $B/admin/verifications -H "Authorization: Bearer $AT" | j "['requests'][0]['id']")
chk "admin approve" "$(curl -s -X POST $B/admin/verifications/$VID/approve -H "Authorization: Bearer $AT" | j "['ok']")" "True"
chk "user now verified" "$(curl -s $B/auth/me -H "Authorization: Bearer $VT" | j "['user']['verified']")" "True"

# 11. admin: user mgmt, genres, reports, novels
chk "admin forbidden for reader" "$(curl -s $B/admin/overview -H "Authorization: Bearer $RT" | j "['error']")" "Admin access required"
OV=$(curl -s $B/admin/overview -H "Authorization: Bearer $AT")
chk "overview users" "$(echo "$OV" | j "['users']>=11")" "True"
chk "ban user" "$(curl -s -X PUT $B/admin/users/$ZID -H "Authorization: Bearer $AT" -H 'Content-Type: application/json' -d '{"banned":true}' | j "['user']['banned']")" "True"
chk "banned cannot login" "$(curl -s -X POST $B/auth/login -H 'Content-Type: application/json' -d "{\"email\":\"writer@demo.app\",\"password\":\"demo123\"}" | j "['error']")" "This account has been suspended"
curl -s -X PUT $B/admin/users/$ZID -H "Authorization: Bearer $AT" -H 'Content-Type: application/json' -d '{"banned":false}' > /dev/null
chk "add genre" "$(curl -s -X POST $B/admin/genres -H "Authorization: Bearer $AT" -H 'Content-Type: application/json' -d '{"name":"Poetry"}' | j "['genre']['name']")" "Poetry"
RID=$(curl -s $B/admin/reports -H "Authorization: Bearer $AT" | python3 -c "import sys,json;print([r['id'] for r in json.load(sys.stdin)['reports'] if r['status']=='open'][0])")
chk "dismiss report" "$(curl -s -X POST $B/admin/reports/$RID/resolve -H "Authorization: Bearer $AT" -H 'Content-Type: application/json' -d '{"action":"dismiss"}' | j "['ok']")" "True"
chk "admin feature novel" "$(curl -s -X PUT $B/admin/novels/$NNID -H "Authorization: Bearer $AT" -H 'Content-Type: application/json' -d '{"featured":true}' | j "['novel']['featured']")" "True"

# 12. cleanup test artifacts
curl -s -X DELETE $B/novels/$NNID -H "Authorization: Bearer $AT" > /dev/null
chk "static index" "$(curl -s -o /dev/null -w '%{http_code}' $BASE/)" "200"
chk "static cover" "$(curl -s -o /dev/null -w '%{http_code}' $BASE/covers/c1.jpg)" "200"

echo ""
echo "RESULT: $pass passed, $fail failed"
