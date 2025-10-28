import { useParams, Link, useNavigate, useLocation } from "react-router-dom";
import "./../styles/PostDetail.css";
import { useState, useEffect, useMemo } from "react";
import Navbar from "../components/Navbar";
import api from "../api/axios";

export default function PostDetail() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();

  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [comment, setComment] = useState("");
  const [err, setErr] = useState("");
  const [closing, setClosing] = useState(false);

  const fromMyPage = Boolean(location.state?.fromMyPage);
  // const isClosed = useMemo(() => post?.status === "CLOSED", [post?.status]);
  const isClosed = post?.status?.toString().toUpperCase() === "CLOSED";

  const userId = localStorage.getItem("userId"); // 로그인 시 저장해둔 유저 ID
  const isMine = post?.authorId?.toString() === userId?.toString();

  // 상세 + 댓글 함께 조회
  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get(`/api/v1/posts/${id}`);
        setPost(data);
        setComments(Array.isArray(data?.comments) ? data.comments : []);
      } catch (e) {
        setErr("게시글 불러오기 실패");
      }
    })();
  }, [id]);

  // 댓글 입력 핸들러
  const handleComment = (e) => setComment(e.target.value);

  // 댓글 등록
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!comment.trim()) return;

    const token = localStorage.getItem("accessToken");
    if (!token) {
      alert("로그인이 필요합니다.");
      return;
    }

    try {
      const payload = { content: comment.trim() };
      // API 경로 수정: /studify prefix 제거
      const { data } = await api.post(
        `/api/v1/posts/${id}/comments`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setComments(Array.isArray(data) ? data : [...comments, data]);
      setComment("");
    } catch (e) {
      console.error("댓글 등록 실패", e);
      if (e?.response?.status === 404 || e?.response?.status === 405) {
        alert("댓글 기능이 아직 구현되지 않았습니다.");
      } else {
        alert("댓글 등록 실패");
      }
    }
  };

  // 댓글 삭제
  const handleDelete = async (commentId) => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      alert("로그인이 필요합니다.");
      return;
    }
    try {
      // API 경로 수정: /studify prefix 제거
      await api.delete(`/api/v1/posts/${id}/comments/${commentId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setComments((prev) => prev.filter((c) => c.commentId !== commentId));
    } catch (e) {
      if (e?.response?.status === 404 || e?.response?.status === 405) {
        alert("댓글 기능이 아직 구현되지 않았습니다.");
      } else {
        alert("댓글 삭제 실패 (작성자만 삭제 가능)");
      }
      console.error("댓글 삭제 실패", e);
    }
  };

  // 모집글 마감
  const handleClose = async () => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      alert("로그인이 필요합니다.");
      return;
    }
    if (isClosed) return;

    try {
      setClosing(true);
      // API 경로 수정: /studify prefix 제거
      const { data } = await api.patch(
        `/api/v1/posts/${id}/close`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setPost((prev) => ({
        ...prev,
        ...(data || {}),
        status: data?.status || "CLOSED",
      }));
      alert("모집이 마감되었습니다.");
    } catch (e) {
      console.error("마감 처리 실패", e);
      if (e?.response?.status === 404 || e?.response?.status === 405) {
        alert("모집 마감 기능이 아직 구현되지 않았습니다.");
      } else {
        alert("마감 처리에 실패했습니다.");
      }
    } finally {
      setClosing(false);
    }
  };

  // 신청하기 버튼 클릭
  const handleApply = async () => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      alert("로그인이 필요합니다.");
      return;
    }
    try {
      // 실제 신청 API 호출 - API 경로 수정: /studify prefix 제거
      await api.post(`/api/v1/applications/posts/${id}`, {}, {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true
      });
      alert("신청이 완료되었습니다.");
    } catch (e) {
      console.error("신청 실패", e);
      if (e?.response?.status === 404 || e?.response?.status === 405) {
        alert("신청 기능이 아직 구현되지 않았습니다.");
      } else {
        alert("신청에 실패했습니다.");
      }
    }
  };

  // 로딩 실패 시
  if (!post) {
    return (
      <div className="container" style={{ padding: 24 }}>
        <Navbar />
        <h2>게시글을 불러올 수 없습니다.</h2>
        <Link to="/">← 홈으로</Link>
      </div>
    );
  }

  const createdAtStr = (() => {
    const v = post?.createdAt;
    if (!v) return "";
    try {
      const d = new Date(v);
      if (isNaN(d)) return String(v);
      return d.toLocaleDateString("ko-KR");
    } catch {
      return String(v);
    }
  })();

  const deadlineStr = (() => {
    const v = post?.deadline;
    if (!v) return "";
    try {
      const d = new Date(v);
      if (isNaN(d)) return String(v);
      return d.toLocaleDateString("ko-KR");
    } catch {
      return String(v);
    }
  })();


  // 상태 변환 함수
  const getStatusLabel = (status) => {
    if (!status) return "";
    switch (status.toString().toUpperCase()) {
      case "OPEN":
        return "모집중";
      case "CLOSED":
        return "모집 마감";
      default:
        return status;
    }
  };

  const categoryMap = {
    study: "스터디",
    project: "프로젝트",
  };
  const categoryStr = categoryMap[post?.category?.toLowerCase()] ?? post?.category;

  // const positionMap = {
  //   be: "백엔드",
  //   fe: "프론트엔드",
  //   pm: "PM",
  //   designer: "디자이너",
  //   ai: "AI",
  //   android: "안드로이드",
  //   ios: "iOS",
  //   web: "웹",
  // };
  // const positionStr = (post.position || [])
  //   .map((p) => positionMap[p.toLowerCase()] ?? p)
  //   .join(", ");

  const positionMap = {
    be: "백엔드",
    fe: "프론트엔드",
    pm: "PM",
    designer: "디자이너",
    ai: "AI",
    android: "안드로이드",
    ios: "iOS",
    web: "웹",
  };

  const normalizePositions = (raw) => {
    if (!raw) return [];
    const list = Array.isArray(raw) ? raw : [raw];
    return list
      .map((p) => {
        if (!p) return null;
        const key = String(p).toLowerCase();
        return positionMap[key] ?? p;
      })
      .filter(Boolean);
  };

  const positionStr = normalizePositions(post.position).join(", ");


  return (
    <>
      <Navbar />
      <div className="post-detail-main-container">
        <div className="post-detail-header">
          <h1>{post.title}</h1>
          <p>
            {(post.author?.nickname ?? post.nickname ?? "익명")} · {createdAtStr}
          </p>
        </div>

        <div className="post-detail-info-row">
          <div className="post-detail-label-row">
            <span className="post-detail-label">모집 구분</span>
            <span className="post-detail-info-value">{categoryStr}</span>
          </div>
          <div className="post-detail-label-row">
            <span className="post-detail-label">진행 방식</span>
            <span className="post-detail-info-value">{post.meetingType}</span>
          </div>
          <div className="post-detail-label-row">
            <span className="post-detail-label">모집 인원</span>
            <span className="post-detail-info-value">{post.recruitmentCount}</span>
          </div>
          <div className="post-detail-label-row">
            <span className="post-detail-label">마감일</span>
            {/* <span className="post-detail-info-value">{post.deadline}</span> */}
            <span className="post-detail-info-value">{deadlineStr}</span>
          </div>
          <div className="post-detail-label-row">
            <span className="post-detail-label">예상 기간</span>
            <span className="post-detail-info-value">{post.duration}</span>
          </div>
          <div className="post-detail-label-row">
            <span className="post-detail-label">모집 분야</span>
            <span className="post-detail-info-value">{positionStr}</span>
          </div>
          <div className="post-detail-label-row">
            <span className="post-detail-label">기술 스택</span>
            <span className="post-detail-info-value">{post.techStack?.join(", ")}</span>
          </div>
          <div className="post-detail-label-row">
            <span className="post-detail-label">상태</span>
            {/* <span className="post-detail-info-value">{post.status}</span> */}
            <span className="post-detail-info-value">{getStatusLabel(post.status)}</span>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 8,
            margin: "12px 0 20px",
          }}
        >
          <button
            className="post-detail-edit-btn"
            // disabled={!fromMyPage || isClosed || closing}
            disabled={!isMine || isClosed || closing}
            onClick={handleClose}
            title={!isMine ? "내 글이 아닙니다" : isClosed ? "이미 마감됨" : "모집 마감"}
          >
            {isClosed ? "마감됨" : closing ? "마감 처리 중..." : "모집 마감"}
          </button>
          <button
            className="post-detail-edit-btn"
            // disabled={!fromMyPage}
            disabled={!isMine}
            onClick={() =>
              navigate(`/write/${post.postId ?? id}`, { state: location.state })
            }
            // title={!fromMyPage ? "내 글이 아닙니다" : "수정하기"}
            title={!isMine ? "내 글이 아닙니다" : "수정하기"}
          >
            수정하기
          </button>
           <button
            className="post-detail-edit-btn"
            // disabled={fromMyPage || isClosed} // 작성자 또는 마감된 글이면 비활성화
            disabled={isMine || isClosed} // 작성자 또는 마감된 글이면 비활성화
            onClick={handleApply}
            // title={fromMyPage ? "내 글은 신청할 수 없습니다" : isClosed ? "마감된 글입니다" : "신청하기"}
            title={isMine ? "내 글은 신청할 수 없습니다" : isClosed ? "마감된 글입니다" : "신청하기"}
          >
            신청하기
          </button>
        </div>

        <hr className="post-detail-hr" />
        <h2 className="post-detail-section-title">프로젝트 소개</h2>
        <pre className="post-detail-content">{post.content}</pre>

        <div className="post-detail-comment-wrap">
          <h3 className="post-detail-comment-title">
            댓글 <span>{comments.length}</span>
          </h3>

          <form className="post-detail-comment-form" onSubmit={handleSubmit}>
            <textarea
              className="post-detail-comment-input"
              placeholder="댓글을 입력하세요."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
            />
            <button className="post-detail-comment-btn" type="submit">
              댓글 등록
            </button>
          </form>

          <div className="post-detail-comment-list">
            {comments.map((c) => (
              <div
                key={c.commentId}
                className="post-detail-comment-item"
                style={{ display: "flex", alignItems: "center", gap: 8 }}
              >
                <div style={{ flex: 1 }}>
                  <strong>
                    {c.author?.nickname ?? c.authorId ?? "익명"}
                  </strong>{" "}
                  : {c.content}
                </div>
                <button
                  onClick={() => handleDelete(c.commentId)}
                  className="post-detail-comment-delete"
                  style={{ color: "red" }}
                  title="댓글 작성자만 삭제 가능"
                >
                  삭제
                </button>
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginTop: 24 }}>
          <Link to="/">← 홈으로</Link>
        </div>
      </div>
    </>
  );
}
