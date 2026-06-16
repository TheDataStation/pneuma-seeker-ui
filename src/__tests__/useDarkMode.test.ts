import { renderHook, act } from "@testing-library/react";
import { useDarkMode } from "@/lib/useDarkMode";

beforeEach(() => {
  localStorage.clear();
  document.documentElement.classList.remove("dark");
});

describe("useDarkMode", () => {
  it("defaults to light mode when no localStorage value is set", () => {
    const { result } = renderHook(() => useDarkMode());
    expect(result.current.isDark).toBe(false);
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("starts in dark mode when localStorage has theme=dark", () => {
    localStorage.setItem("theme", "dark");
    const { result } = renderHook(() => useDarkMode());
    expect(result.current.isDark).toBe(true);
  });

  it("adds dark class to <html> when toggled on", () => {
    const { result } = renderHook(() => useDarkMode());

    act(() => {
      result.current.toggle();
    });

    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("removes dark class from <html> when toggled off", () => {
    localStorage.setItem("theme", "dark");
    const { result } = renderHook(() => useDarkMode());

    act(() => {
      result.current.toggle();
    });

    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("persists dark mode to localStorage on toggle", () => {
    const { result } = renderHook(() => useDarkMode());

    act(() => {
      result.current.toggle();
    });

    expect(localStorage.getItem("theme")).toBe("dark");
  });

  it("persists light mode to localStorage on toggle back", () => {
    localStorage.setItem("theme", "dark");
    const { result } = renderHook(() => useDarkMode());

    act(() => {
      result.current.toggle();
    });

    expect(localStorage.getItem("theme")).toBe("light");
  });

  it("toggles isDark back and forth correctly", () => {
    const { result } = renderHook(() => useDarkMode());

    act(() => { result.current.toggle(); });
    expect(result.current.isDark).toBe(true);

    act(() => { result.current.toggle(); });
    expect(result.current.isDark).toBe(false);
  });
});
