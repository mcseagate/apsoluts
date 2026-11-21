import { useEffect, useRef, useState } from "react";

// A live, GPU-drawn field of molten red veins on black. It is a single
// fragment shader written against raw WebGL, so it adds no library. The
// pointer bends the field, and the canvas only animates while it is on screen.

const VERTEX = `attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }`;

const FRAGMENT = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform vec2 uRes;
uniform float uTime;
uniform vec2 uMouse;
uniform float uIntensity;

float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}
float fbm(vec2 p){
  float v = 0.0, a = 0.5;
  mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
  for (int i = 0; i < 4; i++) { v += a * noise(p); p = m * p; a *= 0.5; }
  return v;
}

void main(){
  float s = min(uRes.x, uRes.y);
  vec2 uv = gl_FragCoord.xy / uRes;
  vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / s;
  vec2 m = (uMouse - 0.5) * uRes / s;
  float t = uTime * 0.05;

  // the pointer pushes the field away from itself
  vec2 d = p - m;
  float r = length(d);
  p += normalize(d + 1e-4) * exp(-r * 3.0) * 0.14;

  vec2 q = vec2(fbm(p * 1.6 + t), fbm(p * 1.6 + vec2(5.2, 1.3) - t));
  vec2 w = vec2(fbm(p * 1.6 + 2.0 * q + vec2(1.7, 9.2) + t * 1.5),
                fbm(p * 1.6 + 2.0 * q + vec2(8.3, 2.8) - t));
  float f = fbm(p * 1.4 + 2.5 * w);

  float vein = pow(1.0 - abs(f * 2.0 - 1.0), 7.0);

  vec3 base = vec3(0.04);
  vec3 red = vec3(0.735, 0.105, 0.105);
  vec3 hot = vec3(1.0, 0.30, 0.20);

  vec3 col = base;
  col += red * smoothstep(0.38, 0.92, f) * 0.62;
  col += hot * vein * 0.7 * (0.35 + 0.65 * smoothstep(0.2, 0.85, f));
  col += red * exp(-r * r * 8.0) * 0.32;

  col *= smoothstep(1.25, 0.15, length(uv - vec2(0.5, 0.55)));
  col = mix(base, col, uIntensity);
  col += (hash(gl_FragCoord.xy + uTime) - 0.5) * 0.025;
  gl_FragColor = vec4(col, 1.0);
}
`;

interface Props {
  className?: string;
  /** 0 is flat black, 1 is full strength. */
  intensity?: number;
  /** Whether the pointer bends the field. */
  interactive?: boolean;
}

const ShaderField = ({ className = "", intensity = 1, interactive = true }: Props) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fallback, setFallback] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl", { antialias: false, alpha: false, powerPreference: "low-power" });
    if (!gl) {
      setFallback(true);
      return;
    }

    const compile = (type: number, source: string) => {
      const shader = gl.createShader(type)!;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      return gl.getShaderParameter(shader, gl.COMPILE_STATUS) ? shader : null;
    };
    const vs = compile(gl.VERTEX_SHADER, VERTEX);
    const fs = compile(gl.FRAGMENT_SHADER, FRAGMENT);
    const program = gl.createProgram();
    if (!vs || !fs || !program) {
      setFallback(true);
      return;
    }
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      setFallback(true);
      return;
    }
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(program, "p");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const uRes = gl.getUniformLocation(program, "uRes");
    const uTime = gl.getUniformLocation(program, "uTime");
    const uMouse = gl.getUniformLocation(program, "uMouse");
    const uIntensity = gl.getUniformLocation(program, "uIntensity");
    gl.uniform1f(uIntensity, intensity);

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    // The field is soft, so it is drawn small and scaled up by the browser.
    const scale = coarse ? 0.35 : 0.5;

    const target = { x: 0.5, y: 0.5 };
    const mouse = { x: 0.5, y: 0.5 };
    let visible = true;
    let raf = 0;
    const start = performance.now();

    const resize = () => {
      const w = Math.max(2, Math.round(canvas.clientWidth * scale));
      const h = Math.max(2, Math.round(canvas.clientHeight * scale));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
      }
      gl.uniform2f(uRes, w, h);
    };

    const draw = (now: number) => {
      mouse.x += (target.x - mouse.x) * 0.06;
      mouse.y += (target.y - mouse.y) * 0.06;
      gl.uniform1f(uTime, reduced ? 20 : (now - start) / 1000);
      gl.uniform2f(uMouse, mouse.x, mouse.y);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    const loop = (now: number) => {
      draw(now);
      raf = requestAnimationFrame(loop);
    };
    const run = () => {
      cancelAnimationFrame(raf);
      if (reduced) {
        draw(performance.now());
        return;
      }
      if (visible && !document.hidden) raf = requestAnimationFrame(loop);
    };

    const onPointer = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      target.x = (e.clientX - rect.left) / rect.width;
      target.y = 1 - (e.clientY - rect.top) / rect.height;
    };

    resize();
    const observer = new ResizeObserver(() => {
      resize();
      if (reduced) draw(performance.now());
    });
    observer.observe(canvas);
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      run();
    });
    io.observe(canvas);
    document.addEventListener("visibilitychange", run);
    if (interactive && !coarse) window.addEventListener("pointermove", onPointer, { passive: true });
    run();

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", run);
      window.removeEventListener("pointermove", onPointer);
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      gl.deleteBuffer(buffer);
    };
  }, [intensity, interactive]);

  if (fallback) {
    return (
      <div
        aria-hidden
        className={className}
        style={{
          background:
            "radial-gradient(ellipse 70% 60% at 60% 40%, hsl(var(--accent) / 0.35), transparent 70%), hsl(var(--background))",
        }}
      />
    );
  }

  return <canvas ref={canvasRef} aria-hidden className={`block h-full w-full ${className}`} />;
};

export default ShaderField;
