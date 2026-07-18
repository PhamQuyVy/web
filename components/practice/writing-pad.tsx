"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { recordStudyActivityAction } from "@/app/actions";

type Point = {
  x: number;
  y: number;
};

type Stroke = {
  points: Point[];
  size: number;
};

type WritingPadProps = {
  hanzi: string;
  meaning?: string;
  compact?: boolean;
};

type WritingScore = {
  score: number;
  title: string;
  tips: string[];
};

function getDistance(a: Point, b: Point) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function getStrokeLength(stroke: Stroke) {
  return stroke.points.reduce((total, point, index) => {
    const previous = stroke.points[index - 1];
    return previous ? total + getDistance(previous, point) : total;
  }, 0);
}

function scoreWriting(strokes: Stroke[], hanzi: string, width: number, height: number): WritingScore {
  const drawableStrokes = strokes.filter((stroke) => stroke.points.length > 1);
  const points = drawableStrokes.flatMap((stroke) => stroke.points);

  if (points.length < 8) {
    return {
      score: 0,
      title: "Chưa đủ nét để chấm.",
      tips: ["Viết đủ chữ rồi bấm chấm điểm.", "Đi chậm và giữ nét liền mạch hơn."],
    };
  }

  const minX = Math.min(...points.map((point) => point.x));
  const maxX = Math.max(...points.map((point) => point.x));
  const minY = Math.min(...points.map((point) => point.y));
  const maxY = Math.max(...points.map((point) => point.y));
  const boxWidth = Math.max(1, maxX - minX);
  const boxHeight = Math.max(1, maxY - minY);
  const areaRatio = (boxWidth * boxHeight) / Math.max(1, width * height);
  const centerX = minX + boxWidth / 2;
  const centerY = minY + boxHeight / 2;
  const centerOffset = Math.hypot(centerX - width / 2, centerY - height / 2) / Math.hypot(width / 2, height / 2);
  const totalLength = drawableStrokes.reduce((total, stroke) => total + getStrokeLength(stroke), 0);
  const expectedStrokes = Math.max(1, Math.min(18, hanzi.length * 5));
  const strokeRatio = Math.min(drawableStrokes.length, expectedStrokes) / expectedStrokes;
  const lengthRatio = Math.min(totalLength / Math.max(width, height), hanzi.length <= 1 ? 2.6 : 4.2);
  const densityScore = Math.min(1, areaRatio / (hanzi.length <= 1 ? 0.38 : 0.55));
  const centerScore = Math.max(0, 1 - centerOffset * 1.8);
  const lengthScore = Math.min(1, lengthRatio / (hanzi.length <= 1 ? 1.15 : 1.8));
  const strokeScore = Math.min(1, strokeRatio + 0.24);
  const smoothnessScore =
    drawableStrokes.reduce((total, stroke) => {
      const length = getStrokeLength(stroke);
      return total + Math.min(1, length / Math.max(1, stroke.points.length * 2.8));
    }, 0) / drawableStrokes.length;

  const score = Math.max(
    1,
    Math.min(
      100,
      Math.round(
        densityScore * 28 +
          centerScore * 24 +
          lengthScore * 20 +
          strokeScore * 16 +
          smoothnessScore * 12,
      ),
    ),
  );
  const tips: string[] = [];

  if (densityScore < 0.55) {
    tips.push("Chữ hơi nhỏ hoặc thiếu nét, hãy viết phủ rộng hơn trong ô.");
  }
  if (centerScore < 0.65) {
    tips.push("Chữ đang lệch tâm, canh theo đường dọc và ngang giữa ô.");
  }
  if (smoothnessScore < 0.65) {
    tips.push("Nét còn run hoặc đứt đoạn, kéo bút chậm và đều hơn.");
  }
  if (strokeScore < 0.65) {
    tips.push("Có vẻ còn thiếu nét, hãy nhìn chữ mẫu và viết đủ từng phần.");
  }
  if (tips.length === 0) {
    tips.push("Nét khá cân, thử ẩn chữ mẫu rồi viết lại để kiểm tra trí nhớ.");
  }

  return {
    score,
    title:
      score >= 90
        ? "Rất đẹp, chữ cân và nét rõ."
        : score >= 75
          ? "Ổn rồi, chỉ cần làm nét đều hơn."
          : score >= 50
            ? "Đúng hướng, nhưng cần cân lại bố cục."
            : "Chưa đạt, viết chậm lại theo chữ mẫu.",
    tips,
  };
}

export function WritingPad({ hanzi, meaning, compact = false }: WritingPadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);
  const currentStrokeRef = useRef<Stroke | null>(null);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [showModel, setShowModel] = useState(true);
  const [brushSize, setBrushSize] = useState(8);
  const [score, setScore] = useState<WritingScore | null>(null);
  const sampleSizeClass =
    hanzi.length <= 1
      ? "text-[10rem] sm:text-[12rem]"
      : hanzi.length === 2
        ? "text-[5.5rem] sm:text-[6.5rem]"
        : hanzi.length === 3
          ? "text-[3.6rem] sm:text-[4.5rem]"
          : "text-[2.6rem] sm:text-[3.4rem]";

  const redraw = useCallback((items: Stroke[]) => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    context.clearRect(0, 0, rect.width, rect.height);
    context.lineCap = "round";
    context.lineJoin = "round";
    context.strokeStyle = "#0f172a";

    items.forEach((stroke) => {
      if (stroke.points.length < 2) {
        return;
      }

      context.lineWidth = stroke.size;
      context.beginPath();
      context.moveTo(stroke.points[0].x, stroke.points[0].y);
      stroke.points.slice(1).forEach((point) => {
        context.lineTo(point.x, point.y);
      });
      context.stroke();
    });
  }, []);

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.round(rect.width * dpr));
    canvas.height = Math.max(1, Math.round(rect.height * dpr));
    redraw(strokes);
  }, [redraw, strokes]);

  useEffect(() => {
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    return () => {
      window.removeEventListener("resize", resizeCanvas);
    };
  }, [resizeCanvas]);

  useEffect(() => {
    redraw(strokes);
  }, [redraw, strokes]);

  const getPoint = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();

    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  };

  const drawLiveSegment = (from: Point, to: Point, size: number) => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) {
      return;
    }

    const dpr = window.devicePixelRatio || 1;
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    context.lineCap = "round";
    context.lineJoin = "round";
    context.strokeStyle = "#0f172a";
    context.lineWidth = size;
    context.beginPath();
    context.moveTo(from.x, from.y);
    context.lineTo(to.x, to.y);
    context.stroke();
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    const point = getPoint(event);
    isDrawingRef.current = true;
    currentStrokeRef.current = { points: [point], size: brushSize };
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || !currentStrokeRef.current) {
      return;
    }

    const point = getPoint(event);
    const previousPoint = currentStrokeRef.current.points.at(-1);
    currentStrokeRef.current.points.push(point);

    if (previousPoint) {
      drawLiveSegment(previousPoint, point, currentStrokeRef.current.size);
    }
  };

  const finishStroke = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || !currentStrokeRef.current) {
      return;
    }

    isDrawingRef.current = false;
    event.currentTarget.releasePointerCapture(event.pointerId);

    const finishedStroke = {
      points: [...currentStrokeRef.current.points],
      size: currentStrokeRef.current.size,
    };

    if (finishedStroke.points.length > 1) {
      setStrokes((current) => [...current, finishedStroke]);
      setScore(null);
    }
    currentStrokeRef.current = null;
  };

  const clearBoard = () => {
    setStrokes([]);
    setScore(null);
  };

  const gradeWriting = () => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const rect = canvas.getBoundingClientRect();
    void recordStudyActivityAction(`writing:${hanzi}`);
    setScore(scoreWriting(strokes, hanzi, rect.width, rect.height));
  };

  return (
    <div>
      {compact ? (
        <div className="mb-3 rounded-md border border-stone-200 bg-[#fffdf5] p-3 text-sm leading-6 text-slate-700">
          <p className="font-semibold text-slate-950">Hướng dẫn viết</p>
          <p>Nhìn chữ mẫu, viết từ trái sang phải, từ trên xuống dưới. Giữ chữ nằm giữa ô.</p>
          {meaning ? <p className="mt-1">Nghĩa: {meaning}</p> : null}
        </div>
      ) : null}

      <div className="relative aspect-square overflow-hidden rounded-md border border-stone-300 bg-white">
        <div className="absolute inset-0 grid grid-cols-2 grid-rows-2">
          <span className="border-b border-r border-dashed border-stone-200" />
          <span className="border-b border-dashed border-stone-200" />
          <span className="border-r border-dashed border-stone-200" />
          <span />
        </div>
        <span className="absolute inset-x-0 top-1/2 border-t border-dashed border-stone-200" />
        <span className="absolute inset-y-0 left-1/2 border-l border-dashed border-stone-200" />
        {showModel ? (
          <span className={`pointer-events-none absolute inset-0 flex items-center justify-center px-4 text-center font-serif leading-none text-orange-200/50 ${sampleSizeClass}`}>
            {hanzi}
          </span>
        ) : null}
        <canvas
          aria-label={`Bảng tập viết chữ ${hanzi}`}
          className="absolute inset-0 h-full w-full touch-none cursor-crosshair"
          onPointerCancel={finishStroke}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={finishStroke}
          ref={canvasRef}
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          className="rounded-md border border-stone-300 bg-white px-3 py-2 text-sm font-semibold hover:bg-stone-50"
          onClick={clearBoard}
          type="button"
        >
          Xóa bảng
        </button>
        <button
          className="rounded-md border border-stone-300 bg-white px-3 py-2 text-sm font-semibold hover:bg-stone-50"
          onClick={() => setShowModel((current) => !current)}
          type="button"
        >
          {showModel ? "Ẩn chữ mẫu" : "Hiện chữ mẫu"}
        </button>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          Nét
          <input
            className="h-2 w-24 accent-orange-600"
            max="14"
            min="4"
            onChange={(event) => setBrushSize(Number(event.target.value))}
            type="range"
            value={brushSize}
          />
        </label>
        <button
          className="rounded-md border border-orange-600 bg-orange-600 px-3 py-2 text-sm font-semibold text-white hover:bg-orange-700"
          onClick={gradeWriting}
          type="button"
        >
          Chấm điểm
        </button>
      </div>

      {score ? (
        <div className="mt-3 rounded-md border border-stone-200 bg-[#fffdf5] p-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-slate-700">Agent chấm chữ</p>
            <p className="text-2xl font-bold text-orange-600">{score.score}/100</p>
          </div>
          <p className="mt-1 font-semibold">{score.title}</p>
          <ul className="mt-2 space-y-1 text-sm leading-6 text-slate-700">
            {score.tips.slice(0, 3).map((tip) => (
              <li key={tip}>- {tip}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
