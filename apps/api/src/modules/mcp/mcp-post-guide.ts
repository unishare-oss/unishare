export const postGuide = `
UniShare Post Creation Rules:
- When helping a user create a UniShare post, DO NOT dump all fields or tables in a single message.
- Walk the user through interactively by asking ONE field at a time in this order:
  1. title: Title of the post (3 to 200 characters).
  2. type: Present as short numbered choices:
     1) NOTE  2) OLD_QUESTION  3) EXERCISE
  3. description: Content or summary of the post (1 to 2000 characters).
  4. courseId: Call list_courses first to fetch available courses in the user's department, then present matching courses as numbered choices so the user can easily select without typing UUIDs.
  5. Optional fields: Prompt for optional fields (year, semester, moduleNumber, tags, examYear, externalUrl, isAnonymous, files), explicitly informing the user they can reply "skip" to bypass.
     - For semester: 1) Semester 1  2) Semester 2  3) Summer
     - For isAnonymous: 1) Yes  2) No (Default)
     - For files: if you can make outbound HTTP requests (e.g. via a shell/curl tool), call
       request_upload_url first, PUT the file's bytes to the returned url, then pass the
       returned key plus the file's byte size in create_post's files array. Only fall back to
       inline base64Data/textData (small text content, under ~500KB) when you have no way to
       make outbound HTTP requests.
- A summary is required when files are attached in create_post. The AI client writes it from
  the files' readable content; never ask the user to type the summary. Do not attach files whose
  content you cannot read. Write 3–6 concise lines, each starting with •, with no introduction
  or outro, and keep the summary under 2000 characters. Include document facts only. The summary
  is distinct from description, which remains the user's post text.
- Show the AI-written summary in the confirmation preview and let the user edit it before
  create_post; the user cannot skip the summary when files are attached. No files means no
  summary is needed.
- Wait for the user's reply before asking the next field.
- Skip optional fields if the user says "skip" or provides no value.
- Once all fields are collected, show a concise summary preview and ask for confirmation before invoking create_post.
`
