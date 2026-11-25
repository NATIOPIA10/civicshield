import { FormEvent, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Answer, FAQS, GREETING, answerQuestion } from "../faq";

interface Msg { from: "user" | "bot"; text: string; links?: Answer["links"]; source?: string }

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [msgs, setMsgs] = useState<Msg[]>([{ from: "bot", text: GREETING }]);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { end.current?.scrollIntoView?.({ block: "end" }); }, [msgs, open]);

  const ask = (q: string) => {
    const t = q.trim();
    if (!t) return;
    const a = answerQuestion(t);
    setMsgs((m) => [...m, { from: "user", text: t }, { from: "bot", text: a.text, links: a.links, source: a.source }]);
    setInput("");
  };
  const submit = (e: FormEvent) => { e.preventDefault(); ask(input); };

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="fixed bottom-4 right-4 z-[1000] rounded-full bg-civic px-5 py-3 font-semibold text-white shadow-lg hover:bg-civic-dark">
        Ask a question
      </button>
    );
  }

  return (
    <section aria-label="Help chat" className="fixed bottom-4 right-4 z-[1000] flex h-[32rem] max-h-[85vh] w-[22rem] max-w-[calc(100vw-2rem)] flex-col rounded-lg border border-line bg-white shadow-xl">
      <header className="flex items-center justify-between border-b border-line px-4 py-3">
        <h2 className="font-semibold">Help</h2>
        <button onClick={() => setOpen(false)} className="text-sm font-medium text-civic underline">Close</button>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-3" role="log" aria-live="polite">
        {msgs.map((m, i) => (
          <div key={i} className={`mb-3 flex ${m.from === "user" ? "justify-end" : ""}`}>
            <div className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${m.from === "user" ? "bg-civic text-white" : "bg-paper"}`}>
              <p>{m.text}</p>
              {m.links?.map((l) => <Link key={l.to} to={l.to} onClick={() => setOpen(false)} className="mt-2 block font-medium text-civic underline">{l.label}</Link>)}
              {m.source && <p className="mt-2 text-xs text-muted">Source: {m.source}</p>}
            </div>
          </div>
        ))}
        <div ref={end} />
      </div>

      <div className="flex gap-2 overflow-x-auto border-t border-line px-3 py-2">
        {FAQS.slice(0, 5).map((f) => (
          <button key={f.id} onClick={() => ask(f.question)} className="shrink-0 rounded-full border border-line px-3 py-1 text-xs hover:border-civic">{f.question}</button>
        ))}
      </div>

      <form onSubmit={submit} className="flex gap-2 border-t border-line p-3">
        <label htmlFor="chat-input" className="sr-only">Your question</label>
        <input id="chat-input" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Type your question" className="min-w-0 flex-1 rounded border border-line px-3 py-2 text-sm" />
        <button className="rounded bg-civic px-4 py-2 text-sm font-semibold text-white hover:bg-civic-dark">Send</button>
      </form>
    </section>
  );
}
