import Navbar from "../components/Navbar";
import { Link, useNavigate } from "react-router-dom";
import "../styles/Footer.css";
import "../styles/MyPage.css";
import { deletePost } from "../api/post"; // 상단에 추가
import { useEffect, useState } from "react";
import api from "../api/axios";

function decodeJwtPayload(token = "") {
  try {
    const [, payload] = token.split(".");
    if (!payload) return null;
    const b64 =
      payload.replace(/-/g, "+").replace(/_/g, "/") +
      "===".slice((payload.length + 3) % 4);
    return JSON.parse(atob(b64));
  } catch {
    return null;
  }
}

async function resolveUserIdByEmail(email, token) {
  console.log("[resolveUserIdByEmail] 시작 - email:", email);
  let page = 0;
  const PAGE_SIZE = 100;
  while (page < 50) {
    const res = await api.get("/api/v1/users", {
      params: { page, size: PAGE_SIZE },
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log("[resolveUserIdByEmail] 페이지", page, "응답:", res.data);
    
    const list = Array.isArray(res?.data)
      ? res.data
      : res?.data?.content || [];
    const me = list.find(
      (u) => (u?.email || "").toLowerCase() === email.toLowerCase()
    );
    if (me?.id) {
      console.log("[resolveUserIdByEmail] 찾음! userId:", me.id);
      return me.id;
    }

    const last = Array.isArray(res?.data) ? true : !!res?.data?.last;
    if (last || list.length < PAGE_SIZE) break;
    page += 1;
  }
  console.log("[resolveUserIdByEmail] 못 찾음");
  return null;
}

export default function MyPage() {
  const navigate = useNavigate();

  const [tab, setTab] = useState("info");
  const [accessToken, setAccessToken] = useState("");
  const [user, setUser] = useState({ id: null, email: "", nickname: "" });
  const [pw, setPw] = useState({ newPassword: "", confirm: "" });

  const [posts, setPosts] = useState([]);
  const [deletingIds, setDeletingIds] = useState(new Set());
  
  const [postsLoading, setPostsLoading] = useState(false);

  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [okMsg, setOkMsg] = useState("");

  // 로그인 사용자 초기화
  useEffect(() => {
    const token = localStorage.getItem("accessToken") || "";
    if (!token) {
      navigate("/signin");
      return;
    }
    setAccessToken(token);

    const payload = decodeJwtPayload(token);
    const email =
      payload?.sub ||
      payload?.email ||
      localStorage.getItem("userEmail") ||
      "";
    const id = parseInt(localStorage.getItem("userId") || "0", 10) || null;
    const nickname = localStorage.getItem("nickname") || "";
    if (!email) {
      navigate("/signin");
      return;
    }

    setUser({ id, email, nickname });
  }, [navigate]);

  // userId 확인 , 닉네임 불러오기
  useEffect(() => {
    console.log("[MyPage] userId 확인 effect - accessToken:", !!accessToken, "user.email:", user.email, "user.id:", user.id);
    
    if (!accessToken || !user.email || user.id) return;
    
    console.log("[MyPage] userId 찾기 시작...");
    
    (async () => {
      try {
        const foundId = await resolveUserIdByEmail(user.email, accessToken);
        console.log("[MyPage] 찾은 userId:", foundId);
        
        if (foundId) {
          localStorage.setItem("userId", String(foundId));
          setUser((u) => ({ ...u, id: foundId }));
          window.dispatchEvent(new Event("auth-changed"));

          try {
            const meRes = await api.get(`/studify/api/v1/users/${foundId}`, {
              headers: { Authorization: `Bearer ${accessToken}` },
            });
            const nick = meRes?.data?.nickname;
            if (typeof nick === "string") {
              setUser((u) => ({ ...u, nickname: nick }));
              localStorage.setItem("nickname", nick);
              window.dispatchEvent(new Event("auth-changed"));
            }
          } catch (_) {}
        } else {
          console.warn("[MyPage] userId를 찾지 못했습니다");
        }
      } catch (e) {
        console.warn("[resolve userId failed]", e?.message);
      }
    })();
  }, [accessToken, user.email, user.id]);

  // 내가 쓴 글 불러오기
  useEffect(() => {
    if (tab !== "posts") return;

    (async () => {
      setPostsLoading(true);
      try {
        const myId = localStorage.getItem("userId");
        console.log("[MyPage] 내 userId:", myId);
        
        if (!myId) {
          console.log("[MyPage] userId 없음");
          setPosts([]);
          return;
        }

        // MSA 백엔드: 전체 글 가져와서 필터링
        const res = await api.get("/api/v1/posts", {
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        console.log("[MyPage] 전체 글 응답:", res.data);
        
        const list = Array.isArray(res?.data) ? res.data : (res?.data?.content || []);
        console.log("[MyPage] 전체 글 목록:", list);

        // 내가 쓴 글만 필터링
        const mine = list.filter((p) => {
          console.log(`[MyPage] 글 ${p.postId}: authorId=${p.authorId}, myId=${myId}, 일치=${String(p.authorId) === String(myId)}`);
          return String(p.authorId) === String(myId);
        });

        console.log("[MyPage] 내가 쓴 글:", mine);
        setPosts(mine);
      } catch (err) {
        console.error("내 글 불러오기 실패", err);
        setPosts([]);
      } finally {
        setPostsLoading(false);
      }
    })();
  }, [tab, accessToken]);




  // 저장
  const handleSave = async () => {
    setErr("");
    setOkMsg("");
    setSaving(true);
    try {
      const nickname = (user.nickname || "").trim();
      const newPw = pw.newPassword.trim();
      const confirm = pw.confirm.trim();

      if (nickname.length > 50) {
        setErr("닉네임 너무 길어요.");
        setSaving(false);
        return;
      }
      if (newPw || confirm) {
        if (newPw.length < 8) {
          setErr("비밀번호는 8자 이상이어야 합니다.");
          setSaving(false);
          return;
        }
        if (newPw !== confirm) {
          setErr("비밀번호가 일치하지 않습니다.");
          setSaving(false);
          return;
        }
      }
      if (!nickname && !newPw) {
        setOkMsg("변경할 내용이 없습니다.");
        setSaving(false);
        return;
      }

      let uid = user.id;
      if (!uid) {
        const foundId = await resolveUserIdByEmail(user.email, accessToken);
        if (foundId) {
          localStorage.setItem("userId", String(foundId));
          setUser((u) => ({ ...u, id: foundId }));
          uid = foundId;
        }
      }

      if (!uid) {
        if (nickname) {
          localStorage.setItem("nickname", nickname);
          window.dispatchEvent(new Event("auth-changed"));
          setOkMsg("저장완료");
        }
        if (newPw) setErr("에러발생ㅠㅠ)");
        setPw({ newPassword: "", confirm: "" });
        setSaving(false);
        return;
      }

      const payload = {};
      if (nickname) payload.nickname = nickname;
      if (newPw) payload.password = newPw;

      if (Object.keys(payload).length) {
        await api.put(`/studify/api/v1/users/${uid}`, payload, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
      }

      if (nickname) {
        localStorage.setItem("nickname", nickname);
        window.dispatchEvent(new Event("auth-changed"));
      }
      setPw({ newPassword: "", confirm: "" });
      setOkMsg("저장되었습니다.");
    } catch (error) {
      const s = error?.response?.status;
      if (s === 400) setErr("입력값을 확인해 주세요.");
      else if (s === 401) setErr("다시 로그인해 주세요.");
      else setErr("에러 발생ㅠㅠ");
    } finally {
      setSaving(false);
    }
  };

  // 로그아웃
  const handleLogout = async () => {
    try {
      await api.post(
        "/api/auth/logout",
        {},
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
    } catch {}
    localStorage.clear();
    setUser({ id: null, email: "", nickname: "" });
    window.dispatchEvent(new Event("auth-changed"));
    navigate("/signin");
  };

  // 회원탈퇴
  const handleDelete = async () => {
    if (!window.confirm("정말로 회원탈퇴 하시겠습니까?")) return;

    try {
      let uid = user.id;

      if (!uid) {
        try {
          uid = await resolveUserIdByEmail(user.email, accessToken);
          if (uid) {
            localStorage.setItem("userId", String(uid));
            setUser((u) => ({ ...u, id: uid }));
          }
        } catch (_) {}
      }

      if (uid) {
        try {
          await api.delete(`/studify/api/v1/users/${uid}`, {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
        } catch (_) {}
      }
    } finally {
      try {
        await api.post("/api/auth/logout", {}, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
      } catch (_) {}

      localStorage.clear();
      window.dispatchEvent(new Event("auth-changed"));

      alert("회원탈퇴 되었습니다.");
      navigate("/signin");
    }
  };


const handleDeletePost = async (postId) => {
  if (!window.confirm("정말로 이 글을 삭제하시겠습니까?")) return;
  try {
    await deletePost(postId);
    setPosts(posts => posts.filter(p => p.postId !== postId));
    alert("삭제되었습니다.");
  } catch (e) {
    alert("삭제에 실패했습니다.");
  }
};

  return (
    <div className="app">
      <Navbar />
      <main className="container mypage-main" style={{ display: "flex", gap: 32 }}>
        <nav className="mypage-menu">
          <ul>
            <li
              className={tab === "info" ? "active" : ""}
              onClick={() => setTab("info")}
            >
              회원정보
            </li>
            <li
              className={tab === "posts" ? "active" : ""}
              onClick={() => setTab("posts")}
            >
              내가 쓴 글
            </li>
          </ul>
        </nav>

        <section className="mypage-content" style={{ flex: 1 }}>
          <h2 className="mypage-title">마이페이지</h2>

          {tab === "info" && (
            <div className="mypage-info-box">
              <div className="mypage-info-item">
                <b>이메일</b>: {user.email}
              </div>

              <div className="mypage-info-item">
                <b>닉네임</b>:
                <input
                  type="text"
                  value={user.nickname || ""}
                  onChange={(e) =>
                    setUser((u) => ({ ...u, nickname: e.target.value }))
                  }
                  placeholder="닉네임을 입력하세요"
                  style={{
                    marginLeft: 8,
                    minWidth: 180,
                    padding: "4px 10px",
                    borderRadius: 8,
                    border: "1px solid #ddd",
                  }}
                />
              </div>

              <hr className="mypage-divider" />

              <div className="mypage-info-item">
                <b>새 비밀번호</b>:
                <input
                  type="password"
                  name="newPassword"
                  value={pw.newPassword}
                  onChange={(e) =>
                    setPw((p) => ({ ...p, newPassword: e.target.value }))
                  }
                  placeholder="8자 이상"
                  autoComplete="new-password"
                  style={{
                    marginLeft: 8,
                    minWidth: 180,
                    padding: "4px 10px",
                    borderRadius: 8,
                    border: "1px solid #ddd",
                  }}
                />
              </div>

              <div className="mypage-info-item">
                <b>새 비밀번호 확인</b>:
                <input
                  type="password"
                  name="confirm"
                  value={pw.confirm}
                  onChange={(e) =>
                    setPw((p) => ({ ...p, confirm: e.target.value }))
                  }
                  placeholder="다시 입력"
                  autoComplete="new-password"
                  style={{
                    marginLeft: 8,
                    minWidth: 180,
                    padding: "4px 10px",
                    borderRadius: 8,
                    border: "1px solid #ddd",
                  }}
                />
              </div>

              {err && (
                <div className="error" role="alert" style={{ marginTop: 8 }}>
                  {err}
                </div>
              )}
              {okMsg && (
                <div className="success" role="status" style={{ marginTop: 8 }}>
                  {okMsg}
                </div>
              )}

              <div className="mypage-save-row">
                <button
                  className="btn primary mypage-save-btn"
                  disabled={saving}
                  onClick={handleSave}
                >
                  {saving ? "저장 중..." : "저장"}
                </button>
              </div>

              <div
                className="container footer-inner mypage-footer-right"
                style={{ marginTop: 16, paddingLeft: 0 }}
              >
                <button className="btn ghost mypage-btn" onClick={handleLogout}>
                  로그아웃
                </button>
                <button className="btn dark mypage-btn" onClick={handleDelete}>
                  회원탈퇴
                </button>
              </div>
            </div>
          )}

          {tab === "posts" && (
            <div className="mypage-posts-box">
              {postsLoading ? (
                <div>불러오는 중...</div>
              ) : posts.length === 0 ? (
                <div className="mypage-posts-empty">작성한 글이 없습니다.</div>
              ) : (
                <ul className="mypage-posts-list">
                  {posts.map((post) => (
                    <li key={post.postId} className="mypage-posts-item" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <Link
                        to={`/posts/${post.postId}`}
                        className="mypage-posts-link"
                        state={{ fromMyPage: true }}
                      >
                        <div className="mypage-posts-title">{post.title}</div>
                        <div className="mypage-posts-meta">
                          {(post.createdAt || "").slice(0, 10)} · 댓글 {post.commentCount ?? 0}
                        </div>
                      </Link>
                      <button
                        className="mypage-posts-delete-btn"
                        onClick={() => handleDeletePost(post.postId)}
                        style={{
                          background: "none",
                          border: "none",
                          color: "#d32f2f",
                          cursor: "pointer",
                          fontWeight: 600,
                          marginLeft: 12,
                          fontSize: 16,
                        }}
                      >
                        삭제하기
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
