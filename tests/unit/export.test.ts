import { describe, expect, it } from "vitest";
import { PERSONAS, questionScore, type Poll } from "@/lib/domain";
import {
  buildExport,
  createdAtFromId,
  csvCell,
  exportFilename,
  toCsv,
} from "@/lib/export";

const NOW = Date.UTC(2026, 9, 9, 12, 0, 0);
const T1 = Date.UTC(2026, 9, 9, 10, 0, 0);
const T2 = Date.UTC(2026, 9, 9, 11, 0, 0);

const poll: Poll = {
  id: "p1",
  question: "Tabs, or spaces?",
  options: [
    { key: "A", label: "Tabs" },
    { key: "B", label: 'Say "spaces"' },
  ],
  correct: "B",
  status: "revealed",
  createdAt: T1,
};

const sample = () =>
  buildExport({
    room: "main",
    now: NOW,
    polls: [{ poll, votes: { A: 2, B: "3" } }],
    questions: [
      {
        id: "qlate",
        text: "Later",
        score: questionScore(4, T2),
        hidden: false,
      },
      {
        id: "qold",
        text: "Old, hidden",
        score: questionScore(1, T1),
        hidden: true,
      },
    ],
    tally: { [PERSONAS[0]]: 2 },
  });

describe("csvCell", () => {
  it("leaves plain values alone", () => {
    expect(csvCell("hello")).toBe("hello");
    expect(csvCell(42)).toBe("42");
    expect(csvCell(true)).toBe("true");
    expect(csvCell(null)).toBe("");
  });
  it("quotes commas, quotes and line breaks", () => {
    expect(csvCell("a,b")).toBe('"a,b"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell("one\ntwo")).toBe('"one\ntwo"');
  });
  it("defuses spreadsheet formulas in text", () => {
    expect(csvCell("=SUM(A1)")).toBe("'=SUM(A1)");
    expect(csvCell("@cmd,x")).toBe('"\'@cmd,x"');
  });
});

describe("buildExport", () => {
  it("builds polls with votes, totals and the correct option", () => {
    const data = sample();
    expect(data.room).toBe("main");
    expect(data.exportedAt).toBe(new Date(NOW).toISOString());
    expect(data.polls).toEqual([
      {
        id: "p1",
        question: "Tabs, or spaces?",
        status: "revealed",
        options: [
          { key: "A", label: "Tabs", votes: 2 },
          { key: "B", label: 'Say "spaces"', votes: 3 },
        ],
        correct: "B",
        total: 5,
      },
    ]);
  });
  it("lists questions oldest first, hidden ones included", () => {
    expect(sample().questions).toEqual([
      {
        text: "Old, hidden",
        votes: 1,
        createdAt: new Date(T1).toISOString(),
        hidden: true,
      },
      {
        text: "Later",
        votes: 4,
        createdAt: new Date(T2).toISOString(),
        hidden: false,
      },
    ]);
  });
  it("fills every persona in the tally", () => {
    const { tally } = sample().quiz;
    expect(Object.keys(tally)).toEqual([...PERSONAS]);
    expect(tally[PERSONAS[0]]).toBe(2);
  });
  it("falls back to the id time when no score is saved", () => {
    const id = `q${T1.toString(36)}ab12`;
    expect(createdAtFromId(id)).toBe(T1);
    const data = buildExport({
      room: "abc",
      now: NOW,
      polls: [],
      questions: [{ id, text: "x", score: null, hidden: true }],
      tally: null,
    });
    expect(data.questions[0]).toMatchObject({ votes: 0, hidden: true });
    expect(data.questions[0].createdAt).toBe(new Date(T1).toISOString());
  });
});

describe("toCsv", () => {
  it("writes one row per option, question and persona", () => {
    const lines = toCsv(sample()).trimEnd().split("\r\n");
    expect(lines[0]).toBe(
      "section,poll_id,status,text,option,label,votes,total,correct,hidden,created_at",
    );
    expect(lines[1]).toBe(
      'poll,p1,revealed,"Tabs, or spaces?",A,Tabs,2,5,false,,',
    );
    expect(lines[2]).toBe(
      'poll,p1,revealed,"Tabs, or spaces?",B,"Say ""spaces""",3,5,true,,',
    );
    expect(lines[3]).toBe(
      `question,,,"Old, hidden",,,1,,,true,${new Date(T1).toISOString()}`,
    );
    expect(lines.filter((l) => l.startsWith("quiz,"))).toHaveLength(
      PERSONAS.length,
    );
    expect(lines.at(-PERSONAS.length)).toBe(`quiz,,,,,${PERSONAS[0]},2,2,,,`);
  });
});

describe("exportFilename", () => {
  it("names the room and the UTC day", () => {
    expect(exportFilename("main", NOW, "csv")).toBe(
      "chatterjar-main-2026-10-09.csv",
    );
    expect(exportFilename("abc", NOW, "json")).toBe(
      "chatterjar-abc-2026-10-09.json",
    );
  });
});
