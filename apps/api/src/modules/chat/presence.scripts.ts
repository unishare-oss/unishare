// Atomically INCR the connection counter and DEL lastSeen on first connection.
// Prevents disconnect's SET lastSeen from slipping in between INCR and DEL.
export const CONNECT_SCRIPT = `
local count = redis.call('INCR', KEYS[1])
if count == 1 then
  redis.call('DEL', KEYS[2])
end
return count
`

// Atomically DECR the connection counter and SET lastSeen when the last connection drops.
// Prevents connect's INCR from slipping in between DECR and SET lastSeen.
// Clamps to 0 on extra disconnects to prevent negative drift without re-broadcasting offline.
export const DISCONNECT_SCRIPT = `
local count = redis.call('DECR', KEYS[1])
if count == 0 then
  redis.call('SET', KEYS[2], ARGV[1])
  return 1
elseif count < 0 then
  redis.call('SET', KEYS[1], 0)
  return 0
end
return 0
`
