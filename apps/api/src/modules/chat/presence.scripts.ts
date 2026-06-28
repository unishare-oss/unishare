// Presence connection counters carry a TTL refreshed by client heartbeats.
// If an api pod crashes, its sockets' disconnect handlers never run — the TTL
// expiring is what prevents those users from being stuck online forever.

// Atomically INCR the connection counter (with TTL) and DEL lastSeen on first connection.
// Prevents disconnect's SET lastSeen from slipping in between INCR and DEL.
export const CONNECT_SCRIPT = `
local count = redis.call('INCR', KEYS[1])
redis.call('PEXPIRE', KEYS[1], ARGV[1])
if count == 1 then
  redis.call('DEL', KEYS[2])
end
return count
`

// Atomically DECR the connection counter and SET lastSeen when the last connection drops.
// Deletes the counter at zero so stale keys never linger; clamps negative drift
// (extra disconnects) without re-broadcasting offline.
export const DISCONNECT_SCRIPT = `
local count = redis.call('DECR', KEYS[1])
if count <= 0 then
  redis.call('DEL', KEYS[1])
  if count == 0 then
    redis.call('SET', KEYS[2], ARGV[1])
    return 1
  end
  return 0
end
return 0
`

// Refresh the counter TTL and keep lastSeen current so a crash leaves at most
// one heartbeat interval of staleness. If the counter is gone (TTL expired
// while this socket was actually alive — e.g. a long network partition that
// socket.io survived), re-register the connection and signal the caller to
// re-broadcast online. The count may temporarily undercount multi-tab users
// in that case; it self-corrects as tabs disconnect/reconnect.
export const HEARTBEAT_SCRIPT = `
if redis.call('EXISTS', KEYS[1]) == 1 then
  redis.call('PEXPIRE', KEYS[1], ARGV[1])
  redis.call('SET', KEYS[2], ARGV[2])
  return 0
end
redis.call('SET', KEYS[1], 1, 'PX', ARGV[1])
redis.call('SET', KEYS[2], ARGV[2])
return 1
`
