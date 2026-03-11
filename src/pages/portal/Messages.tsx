import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import PortalLayout from "@/components/portal/PortalLayout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Send } from "lucide-react";

interface Project {
  id: string;
  name: string;
}

interface Message {
  id: string;
  content: string;
  user_id: string;
  created_at: string;
  project_id: string;
}

const Messages = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("projects").select("id, name").then(({ data }) => {
      if (data && data.length > 0) {
        setProjects(data);
        setSelectedProject(data[0].id);
      }
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!selectedProject) return;
    supabase
      .from("project_messages")
      .select("*")
      .eq("project_id", selectedProject)
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        if (data) setMessages(data);
      });
  }, [selectedProject]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !user || !selectedProject) return;
    setSending(true);
    const { error } = await supabase.from("project_messages").insert({
      project_id: selectedProject,
      user_id: user.id,
      content: newMessage.trim(),
    });
    setSending(false);
    if (error) {
      toast.error("Failed to send message.");
    } else {
      setNewMessage("");
      // Refresh messages
      const { data } = await supabase
        .from("project_messages")
        .select("*")
        .eq("project_id", selectedProject)
        .order("created_at", { ascending: true });
      if (data) setMessages(data);
    }
  };

  return (
    <PortalLayout>
      <div className="max-w-3xl">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold">Messages</h1>
          <p className="text-muted-foreground mt-1">Communicate with the Liftor AI team</p>
        </div>

        {loading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : projects.length === 0 ? (
          <div className="p-12 rounded-xl border border-border/50 bg-card text-center text-muted-foreground">
            No projects available for messaging.
          </div>
        ) : (
          <>
            <div className="mb-6">
              <label className="text-sm font-medium mb-1.5 block">Project</label>
              <Select value={selectedProject} onValueChange={setSelectedProject}>
                <SelectTrigger className="bg-secondary border-border w-full max-w-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Thread */}
            <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
              <div className="max-h-[400px] overflow-y-auto p-4 space-y-3">
                {messages.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No messages yet. Start the conversation.</p>
                ) : (
                  messages.map((m) => (
                    <div
                      key={m.id}
                      className={`p-3 rounded-lg text-sm max-w-[80%] ${
                        m.user_id === user?.id
                          ? "ml-auto bg-primary/10 text-foreground"
                          : "bg-secondary text-foreground"
                      }`}
                    >
                      <p>{m.content}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(m.created_at).toLocaleString()}
                      </p>
                    </div>
                  ))
                )}
              </div>

              <div className="border-t border-border/50 p-4 flex gap-3">
                <Textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="bg-secondary border-border min-h-[60px] flex-1"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                />
                <Button variant="glow" size="icon" onClick={sendMessage} disabled={sending || !newMessage.trim()}>
                  <Send size={16} />
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </PortalLayout>
  );
};

export default Messages;
