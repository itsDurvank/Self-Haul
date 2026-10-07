
# to check question by user id in database

SELECT 
  au.email AS user_email,
  up.full_name AS user_name,
  q.raw_text AS question,
  a.raw_text AS user_answer,
  q.created_at
FROM public.questions q
LEFT JOIN auth.users au ON q.user_id = au.id
LEFT JOIN public.user_profiles up ON q.user_id = up.user_id
LEFT JOIN public.answers a ON q.id = a.question_id
ORDER BY q.created_at DESC;
