#!/bin/zsh
# Requires jq and a running IWSDK managed browser. This resets its app tab.
cd "${0:A:h}/.."
iw() { ./node_modules/.bin/iwsdk "$@"; }
set -e
ok() { jq -e '.ok' >/dev/null; }
state() { iw ecs query --input-json "{\"entityIndex\":$1}" | jq -ec '.data.result.components'; }
find_id() { iw ecs find --input-json "$(jq -nc --arg name "$1" '{namePattern:$name}')" | jq -er '.data.result.entities[0].entityIndex'; }
move() { iw xr animate-to --input-json "$(printf '{"device":"hand-right","position":{"x":%s,"y":%s,"z":%s},"orientation":{"pitch":0,"yaw":0,"roll":0},"duration":0.36}' "$1" "$2" "$3")" | ok; }
pinch() { iw xr set-select-value --input-json "{\"device\":\"hand-right\",\"value\":$1}" | ok; }
tag() { state "$1" | jq -e --arg t "$2" 'any(.[];.componentId==$t)'; }
field() { state "$1" | jq -e --arg field "$2" 'any(.[];.componentId=="AssemblyPart" and .values[$field])'; }

click_panel() {
  local panel coordinates
  panel=$(find_id 'Assembly Instructions')
  coordinates=$(jq -nc --argjson ui "$(iw ui inspect --input-json "{\"entityIndex\":$panel}" | jq -ec '.data.result')" --argjson tr "$(state "$panel" | jq -ec '.[]|select(.componentId=="Transform").values')" --arg id "$1" '
    ($ui.elements[]|select(.id==$id)) as $button |
    {device:"hand-right",target:{x:($tr.position[0]+$button.layout.relativeCenter[0]*$tr.scale[0]*0.01),y:($tr.position[1]+(38-$ui.panel.computedSize.height/2)*$tr.scale[1]*0.01),z:$tr.position[2]}}')
  iw xr look-at --input-json "$coordinates" | ok
  iw ui inspect --input-json "{\"entityIndex\":$panel}" | jq -e --arg id "$1" 'any(.data.result.elements[];.id==$id and .state.hovered)'
  iw xr select --input-json '{"device":"hand-right","duration":0.24}' | ok
}

qa_start_ms=$(($(date +%s) * 1000))
iw browser reload | ok
sleep 1.5
if ! iw xr status | jq -e '.data.result.sessionActive' >/dev/null; then iw xr enter | ok; fi
iw xr set-input-mode --input-json '{"mode":"hand"}' | ok
iw xr look-at --input-json '{"device":"headset","target":{"x":0,"y":1.30,"z":-0.70}}' | ok
for session in 1 2; do
move 0.25 1.30 -0.42
click_panel start
state "$(find_id 'Watch Movement')" | jq -e 'any(.[];.componentId=="WatchProgress" and .values.started)'
echo 'PASS hand-only onboarding'
dial=$(find_id 'Watch Dial'); hour=$(find_id 'Hour Hand'); minute=$(find_id 'Minute Hand'); seconds=$(find_id 'Seconds Hand'); movement=$(find_id 'Watch Movement')
tag "$minute" OneHandGrabbable && exit 1
move 0.219 1.176 -0.624
pinch 1
tag "$dial" Grabbed
move 0.010 1.234 -0.56
field "$dial" aligned
pinch 0
sleep 0.8
field "$dial" seated
echo 'PASS dial'
move 0.132 1.181 -0.465
pinch 1
tag "$hour" Grabbed
move 0 1.256 -0.56
field "$hour" aligned
pinch 0
sleep 0.45
field "$hour" seated && exit 1
tag "$hour" OneHandGrabbable
echo 'PASS early release rejected'
move 0.132 1.181 -0.465
pinch 1
tag "$hour" Grabbed
move 0 1.256 -0.56
field "$hour" aligned
move 0 1.228 -0.56
sleep 0.32
field "$hour" seated
pinch 0
sleep 0.5
echo 'PASS hour press'
move 0.219 1.181 -0.458
pinch 1
tag "$minute" Grabbed
move 0 1.263 -0.56
field "$minute" aligned
move 0 1.234 -0.56
sleep 0.32
field "$minute" seated
pinch 0
sleep 0.5
echo 'PASS minute press'
move 0.304 1.181 -0.450
pinch 1
tag "$seconds" Grabbed
move 0 1.263 -0.56
field "$seconds" aligned
pinch 0
sleep 0.8
field "$seconds" seated
tag "$movement" OneHandGrabbable
echo 'PASS seconds release'

move 0.055 1.197 -0.537
pinch 1
tag "$movement" Grabbed
move -0.168 1.222 -0.512
field "$movement" aligned
pinch 0
sleep 1.15
field "$movement" seated
tag "$(find_id 'Winding Crown')" OneHandGrabbable
echo 'PASS existing five stages and crown unlock'


seat() {
  local piece
  piece=$(find_id "$1")
  shift
  move "$1" "$2" "$3"
  pinch 1
  tag "$piece" Grabbed
  move "$4" "$5" "$6"
  field "$piece" aligned
  pinch 0
  sleep "$7"
  field "$piece" seated
}
seat 'Winding Crown' 0.219 1.176 -0.624 -0.121 1.217 -0.535 1.6
echo 'PASS crown'
seat 'Case Back' 0.217 1.195 -0.551 -0.223 1.348 -0.534 1.95
echo 'PASS case back'
seat 'Front Bracelet' 0.153 1.215 -0.581 -0.223 1.226 -0.442 0.80
echo 'PASS front bracelet'
seat 'Rear Bracelet' 0.279 1.215 -0.581 -0.223 1.226 -0.626 0.85
echo 'PASS rear bracelet'

movement=$(find_id 'Watch Movement'); fixture=$(find_id 'Watch Case'); crown=$(find_id 'Winding Crown'); seconds=$(find_id 'Seconds Hand')
progress() { state "$movement" | jq -ec '.[]|select(.componentId=="WatchProgress").values'; }
rotation() { state "$1" | jq -ec '.[]|select(.componentId=="Transform").values.orientation'; }
progress | jq -e '.phase==1 and .installed==9'
move -0.132 1.199 -0.535
pinch 1
tag "$crown" Grabbed
iw xr animate-to --input-json '{"device":"hand-right","orientation":{"pitch":65,"yaw":0,"roll":0},"duration":0.52}' | ok
progress | jq -e '.winding>0.1 and .winding<0.3'
if [[ "$session" == 1 ]]; then
  for pitch in 0 65 0 65; do
    iw xr animate-to --input-json "{\"device\":\"hand-right\",\"orientation\":{\"pitch\":$pitch,\"yaw\":0,\"roll\":0},\"duration\":0.50}" | ok
  done
  pinch 0
else
  pinch 0
  move 0.26 1.32 -0.42
  for turn in 1 2 3 4; do click_panel wind; done
fi
sleep 0.45
progress | jq -e '.winding==1 and .phase>=2'
seconds_before=$(rotation "$seconds")
move 0.27 1.22 -0.42
sleep 11.5
seconds_after=$(rotation "$seconds")
test "$seconds_before" != "$seconds_after"
progress | jq -e '.phase==4 and .installed==9 and .winding==1'
for name in 'Watch Dial' 'Hour Hand' 'Minute Hand' 'Seconds Hand' 'Watch Movement' 'Winding Crown' 'Case Back' 'Front Bracelet' 'Rear Bracelet'; do
  piece=$(find_id "$name")
  expected_parent="$fixture"
  case "$name" in 'Watch Dial'|'Hour Hand'|'Minute Hand'|'Seconds Hand') expected_parent="$movement";; esac
  state "$piece" | jq -e --argjson parent "$expected_parent" 'any(.[];.componentId=="Transform" and .values.parent.entityIndex==$parent) and any(.[];.componentId=="AssemblyPart" and .values.seated) and (any(.[];.componentId=="OneHandGrabbable")|not)'
done
move -0.055 1.358 -0.617
pinch 1
tag "$fixture" Grabbed
pose_before=$(rotation "$fixture")
iw xr animate-to --input-json '{"device":"hand-right","orientation":{"pitch":30,"yaw":20,"roll":0},"duration":0.5}' | ok
pose_held=$(rotation "$fixture")
test "$pose_held" != "$pose_before"
pinch 0
sleep 0.35
test "$pose_held" = "$(rotation "$fixture")"
echo "PASS session $session completed; all parts attached; inspection pose retained"
if [[ "$session" == 1 ]]; then
  move 0.27 1.30 -0.42
  click_panel restart
  sleep 0.2
  progress | jq -e '(.started|not) and .installed==0 and .phase==0 and .winding==0'
  echo 'PASS in-scene restart before session 2'
fi
done
iw browser logs --input-json '{"count":60}' | jq -e --argjson since "$qa_start_ms" '[.data.result[]|select(.timestamp >= $since and .level=="error" and (.message|contains("net::ERR_ABORTED")|not))]|length==0'
echo 'PASS two controller-free sessions with no browser errors'

