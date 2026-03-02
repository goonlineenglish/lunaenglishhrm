-- Allow advisors to update student status and updated_at columns
-- Previously only admin could UPDATE students; advisors had SELECT only

CREATE POLICY advisor_students_update ON public.students
  FOR UPDATE
  USING (public.get_user_role() = 'advisor')
  WITH CHECK (public.get_user_role() = 'advisor');
