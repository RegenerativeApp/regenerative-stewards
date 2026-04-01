"use client";

import { useEffect, useRef, useState } from "react";

type Message = { role: "user" | "assistant"; content: string };

export default function MentorPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function sendMessage() {
    const text = input.trim();
    if (!text || loading) return;

    const userMessage: Message = { role: "user", content: text };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/mentor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages }),
      });
      const data = await res.json();
      if (data.error) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.error },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.message ?? "" },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Request failed. Is the dev server running?",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-stone-100 text-stone-900">
      <header className="border-b border-stone-200 bg-stone-50 px-4 py-3">
        <h1 className="text-lg font-medium">Mentor</h1>
      </header>

      <div className="flex flex-1 flex-col overflow-hidden">
        <ul className="flex-1 space-y-3 overflow-y-auto p-4">
          {messages.map((m, i) => (
            <li
              key={i}
              className={`max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
                m.role === "user"
                  ? "ml-auto bg-amber-900 text-amber-50"
                  : "mr-auto border border-stone-200 bg-white"
              }`}
            >
              {m.content}
            </li>
          ))}
          {loading ? (
            <li className="mr-auto max-w-[85%] rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-500">
              …
            </li>
          ) : null}
          <div ref={bottomRef} />
        </ul>

        <div className="border-t border-stone-200 bg-stone-50 p-4">
          <div className="mx-auto flex max-w-2xl gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void sendMessage();
                }
              }}
              rows={3}
              placeholder="Message…"
              className="min-h-[4.5rem] flex-1 resize-none rounded border border-stone-300 bg-white px-3 py-2 text-sm outline-none focus:border-amber-800"
            />
            <button
              type="button"
              onClick={() => void sendMessage()}
              disabled={loading || !input.trim()}
              className="self-end rounded bg-amber-900 px-4 py-2 text-sm font-medium text-amber-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
