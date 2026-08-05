-- Trigger to auto-update conversation metadata when a message is inserted.
-- Replaces the 3 sequential app-side round-trips with a single atomic DB operation.
CREATE OR REPLACE FUNCTION fn_update_conversation_on_message()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_is_a BOOLEAN;
BEGIN
  SELECT (participant_a_id = NEW.sender_id) INTO v_is_a
  FROM conversations WHERE id = NEW.conversation_id;

  IF v_is_a THEN
    UPDATE conversations
    SET last_message    = NEW.content,
        last_message_at = NOW(),
        unread_count_b  = unread_count_b + 1
    WHERE id = NEW.conversation_id;
  ELSE
    UPDATE conversations
    SET last_message    = NEW.content,
        last_message_at = NOW(),
        unread_count_a  = unread_count_a + 1
    WHERE id = NEW.conversation_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_update_conversation_on_message ON messages;

CREATE TRIGGER trg_update_conversation_on_message
  AFTER INSERT ON messages
  FOR EACH ROW EXECUTE FUNCTION fn_update_conversation_on_message();

-- Revoke public execute so only the trigger (SECURITY DEFINER) runs it
REVOKE EXECUTE ON FUNCTION fn_update_conversation_on_message() FROM PUBLIC;
