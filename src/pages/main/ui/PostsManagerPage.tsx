import { useMemo, useState } from "react"
import { Edit2, MessageSquare, Plus, Search, ThumbsDown, ThumbsUp, Trash2 } from "lucide-react"
import { useLocation, useNavigate } from "react-router-dom"
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Textarea,
} from "../../../shared/ui"
import { useMutation, useQuery } from "@tanstack/react-query"
import { postQueries } from "../../../entities/post/api/queries"
import { SortOrder } from "../../../entities/post/model/types"
import { userQueries } from "../../../entities/user/api/queries"
import { commentQueries } from "../../../entities/comment/api/queries"
import { queryClient } from "../../../shared/api/query-client"
import { Comment } from "../../../entities/comment/model/types"
import { postMutations } from "../../../entities/post/api/mutations"
import { commentMutations } from "../../../entities/comment/api/mutations"
import { useViewUserProfile } from "../../../features/view-user-profile/model/use-view-user-profile"
import { UserProfileModal } from "../../../entities/user/ui/UserProfileModal"

const PostsManager = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const queryParams = new URLSearchParams(location.search)

  // 상태 관리
  const skip = useMemo(() => parseInt(queryParams.get("skip") || "0"), [location.search])
  const limit = useMemo(() => parseInt(queryParams.get("limit") || "10"), [location.search])
  const searchQuery = queryParams.get("search") || ""
  const sortBy = queryParams.get("sortBy") || ""
  const sortOrder = (queryParams.get("sortOrder") || "asc") as SortOrder
  const selectedTag = queryParams.get("tag") || ""
  const selectedPostId = queryParams.get("selectedPostId")
  const mode = queryParams.get("mode")

  const [showAddDialog, setShowAddDialog] = useState(false)
  const [newPost, setNewPost] = useState({ title: "", body: "", userId: 1 })

  const [, setComments] = useState({})
  const [selectedComment, setSelectedComment] = useState(null)
  const [newComment, setNewComment] = useState({ body: "", postId: null, userId: 1 })
  const [showAddCommentDialog, setShowAddCommentDialog] = useState(false)
  const [showEditCommentDialog, setShowEditCommentDialog] = useState(false)

  // URL 업데이트 함수
  const updateURLParams = (updates: Record<string, string | null>) => {
    const newParams = new URLSearchParams(location.search)

    Object.entries(updates).forEach(([key, value]) => {
      if (value === null) {
        newParams.delete(key)
      } else {
        newParams.set(key, value)
      }
    })

    navigate(`?${newParams.toString()}`)
  }

  const { data: list, isLoading: isListLoading } = useQuery({
    ...postQueries.listQuery({
      limit,
      skip,
      sortBy,
      order: sortOrder as SortOrder,
    }),
    select: (data) => ({
      posts: data.posts,
      total: data.total,
    }),
  })

  const { data: listByTag, isLoading: isTagLoading } = useQuery({
    ...postQueries.listByTagQuery({
      limit,
      skip,
      sortBy,
      order: sortOrder as SortOrder,
      tag: selectedTag,
    }),
    select: (data) => ({
      posts: data.posts,
      total: data.total,
    }),
    enabled: !!selectedTag,
  })

  const { data: searchResults, isLoading: isSearchLoading } = useQuery({
    ...postQueries.searchQuery({
      limit,
      skip,
      sortBy,
      order: sortOrder as SortOrder,
      search: searchQuery,
    }),
    select: (data) => ({
      posts: data.posts,
      total: data.total,
    }),
  })

  const { data: selectedPost } = useQuery({
    ...postQueries.detailQuery(selectedPostId || ""),
    enabled: !!selectedPostId,
  })

  const { data: { users } = { users: [] } } = useQuery({
    ...userQueries.listQuery(),
    select: (data) => ({
      users: data.users,
    }),
  })

  const { data: tags = [] } = useQuery({
    ...postQueries.tagQuery(),
  })

  const addPostMutation = useMutation({
    ...postMutations.addMutation(),
    onError: (error) => {
      console.error("게시물 추가 오류:", error)
    },
  })

  const updatePostMutation = useMutation({
    ...postMutations.updateMutation(),
    onError: (error) => {
      console.error("게시물 업데이트 오류:", error)
    },
  })

  const deletePostMutation = useMutation({
    ...postMutations.deleteMutation(),
    onError: (error) => {
      console.error("게시물 삭제 오류:", error)
    },
  })

  const { data: comments } = useQuery({
    ...commentQueries.byPostQuery(Number(selectedPostId) || 0),
    select: (data) => data?.comments,
  })

  const addCommentMutation = useMutation({
    ...commentMutations.addMutation(),
    onSuccess: () => {
      queryClient.setQueryData<{ comments: Comment[] }>(
        commentQueries.byPost(Number(selectedPostId)),
        (old = { comments: [] }) => ({
          comments: [
            ...old.comments,
            {
              id: Date.now(),
              body: newComment.body,
              postId: Number(selectedPostId),
              userId: 1,
              likes: 0,
              user: {
                id: 1,
                username: "현재 사용자",
                fullName: "Current User",
              },
            },
          ],
        }),
      )
    },
    onError: (error) => {
      console.error("게시물 추가 오류:", error)
    },
  })

  const posts = searchQuery ? searchResults?.posts : selectedTag ? listByTag?.posts : list?.posts

  const total = (searchQuery ? searchResults?.total : selectedTag ? listByTag?.total : list?.total) ?? 0

  const isPostsLoading = isListLoading || isTagLoading || isSearchLoading

  const postsWithUsers = useMemo(() => {
    if (!posts || !users) return []

    return posts.map((post) => ({
      ...post,
      author: users.find((user) => user.id === post.userId),
    }))
  }, [posts, users])

  // 게시물 검색
  const searchPosts = (value: string) => {
    updateURLParams({
      search: value || null,
      skip: "0",
    })
  }

  // 게시물 추가
  const addPost = async () => {
    await addPostMutation.mutateAsync(newPost)
    setShowAddDialog(false)
    setNewPost({ title: "", body: "", userId: 1 })
  }

  // 게시물 업데이트
  const updatePost = async () => {
    if (!selectedPost) return

    await updatePostMutation.mutateAsync({
      id: selectedPost.id,
      post: {
        title: selectedPost.title,
        body: selectedPost.body,
        userId: selectedPost.userId,
      },
    })
    updateURLParams({ selectedPostId: null, mode: null })
  }

  // 게시물 삭제
  const deletePost = async (id: number) => {
    await deletePostMutation.mutateAsync(id)
  }

  // 댓글 추가
  const addComment = async () => {
    if (!newComment.body || !selectedPostId) return

    await addCommentMutation.mutateAsync({
      body: newComment.body,
      postId: Number(selectedPostId),
      userId: 1,
    })
    setShowAddCommentDialog(false)
    setNewComment({ body: "", postId: null, userId: 1 })
  }

  // 댓글 업데이트
  const updateComment = async () => {
    try {
      const response = await fetch(`/api/comments/${selectedComment.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: selectedComment.body }),
      })
      const data = await response.json()
      setComments((prev) => ({
        ...prev,
        [data.postId]: prev[data.postId].map((comment) => (comment.id === data.id ? data : comment)),
      }))
      setShowEditCommentDialog(false)
    } catch (error) {
      console.error("댓글 업데이트 오류:", error)
    }
  }

  // 댓글 삭제
  const deleteComment = async (id, postId) => {
    try {
      await fetch(`/api/comments/${id}`, {
        method: "DELETE",
      })
      setComments((prev) => ({
        ...prev,
        [postId]: prev[postId].filter((comment) => comment.id !== id),
      }))
    } catch (error) {
      console.error("댓글 삭제 오류:", error)
    }
  }

  // 댓글 좋아요
  const likeComment = async (id, postId) => {
    try {
      const response = await fetch(`/api/comments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ likes: comments[postId].find((c) => c.id === id).likes + 1 }),
      })
      const data = await response.json()
      setComments((prev) => ({
        ...prev,
        [postId]: prev[postId].map((comment) =>
          comment.id === data.id ? { ...data, likes: comment.likes + 1 } : comment,
        ),
      }))
    } catch (error) {
      console.error("댓글 좋아요 오류:", error)
    }
  }

  const { isOpen, handleViewProfile, handleClose, user } = useViewUserProfile()

  // 하이라이트 함수 추가
  const highlightText = (text: string, highlight: string) => {
    if (!text) return null
    if (!highlight.trim()) {
      return <span>{text}</span>
    }
    const regex = new RegExp(`(${highlight})`, "gi")
    const parts = text.split(regex)
    return (
      <span>
        {parts.map((part, i) => (regex.test(part) ? <mark key={i}>{part}</mark> : <span key={i}>{part}</span>))}
      </span>
    )
  }

  // 게시물 테이블 렌더링
  const renderPostTable = () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[50px]">ID</TableHead>
          <TableHead>제목</TableHead>
          <TableHead className="w-[150px]">작성자</TableHead>
          <TableHead className="w-[150px]">반응</TableHead>
          <TableHead className="w-[150px]">작업</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {postsWithUsers.map((post) => (
          <TableRow key={post.id}>
            <TableCell>{post.id}</TableCell>
            <TableCell>
              <div className="space-y-1">
                <div>{highlightText(post.title, searchQuery)}</div>

                <div className="flex flex-wrap gap-1">
                  {post.tags?.map((tag) => (
                    <span
                      key={tag}
                      className={`px-1 text-[9px] font-semibold rounded-[4px] cursor-pointer ${
                        selectedTag === tag
                          ? "text-white bg-blue-500 hover:bg-blue-600"
                          : "text-blue-800 bg-blue-100 hover:bg-blue-200"
                      }`}
                      onClick={() => updateURLParams({ tag, skip: "0" })}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </TableCell>
            <TableCell>
              <div
                className="flex items-center space-x-2 cursor-pointer"
                onClick={() => {
                  if (post.author) {
                    handleViewProfile(post.author.id)
                  }
                }}
              >
                <img src={post.author?.image} alt={post.author?.username} className="w-8 h-8 rounded-full" />
                <span>{post.author?.username}</span>
              </div>
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-2">
                <ThumbsUp className="w-4 h-4" />
                <span>{post.reactions?.likes || 0}</span>
                <ThumbsDown className="w-4 h-4" />
                <span>{post.reactions?.dislikes || 0}</span>
              </div>
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    updateURLParams({
                      selectedPostId: post.id.toString(),
                      mode: "detail",
                    })
                  }
                >
                  <MessageSquare className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    updateURLParams({
                      selectedPostId: post.id.toString(),
                      mode: "edit",
                    })
                  }
                >
                  <Edit2 className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => deletePost(post.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )

  // 댓글 렌더링
  const renderComments = () => (
    <div className="mt-2">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold">댓글</h3>
        <Button
          size="sm"
          onClick={() => {
            setNewComment((prev) => ({ ...prev, postId: selectedPostId }))
            setShowAddCommentDialog(true)
          }}
        >
          <Plus className="w-3 h-3 mr-1" />
          댓글 추가
        </Button>
      </div>
      <div className="space-y-1">
        {comments?.map((comment) => (
          <div key={comment.id} className="flex items-center justify-between text-sm border-b pb-1">
            <div className="flex items-center space-x-2 min-w-0 flex-1">
              <span className="font-medium whitespace-nowrap">{comment.user.username}:</span>
              <span className="break-all">{highlightText(comment.body, searchQuery)}</span>
            </div>
            <div className="flex items-center space-x-1 flex-shrink-0">
              <Button variant="ghost" size="sm" onClick={() => likeComment(comment.id, selectedPostId)}>
                <ThumbsUp className="w-3 h-3" />
                <span className="ml-1 text-xs">{comment.likes}</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedComment(comment)
                  setShowEditCommentDialog(true)
                }}
              >
                <Edit2 className="w-3 h-3" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => deleteComment(comment.id, selectedPostId)}>
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <Card className="w-full max-w-6xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>게시물 관리자</span>
          <Button onClick={() => setShowAddDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            게시물 추가
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4">
          {/* 검색 및 필터 컨트롤 */}
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="게시물 검색..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => searchPosts(e.target.value)}
                />
              </div>
            </div>
            <Select
              value={selectedTag}
              onValueChange={(value) =>
                updateURLParams({
                  tag: value === "all" ? null : value,
                  skip: "0",
                })
              }
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="태그 선택" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">모든 태그</SelectItem>
                {tags?.map((tag) => (
                  <SelectItem key={tag.url} value={tag.slug}>
                    {tag.slug}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={(value) => updateURLParams({ sortBy: value || null })}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="정렬 기준" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">없음</SelectItem>
                <SelectItem value="id">ID</SelectItem>
                <SelectItem value="title">제목</SelectItem>
                <SelectItem value="reactions">반응</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortOrder} onValueChange={(value) => updateURLParams({ sortOrder: value })}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="정렬 순서" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="asc">오름차순</SelectItem>
                <SelectItem value="desc">내림차순</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 게시물 테이블 */}
          {isPostsLoading ? <div className="flex justify-center p-4">로딩 중...</div> : renderPostTable()}

          {/* 페이지네이션 */}
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span>표시</span>
              <Select
                value={limit.toString()}
                onValueChange={(value) =>
                  updateURLParams({
                    limit: value,
                    skip: "0",
                  })
                }
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="10" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="30">30</SelectItem>
                </SelectContent>
              </Select>
              <span>항목</span>
            </div>
            <div className="flex gap-2">
              <Button
                disabled={skip === 0}
                onClick={() =>
                  updateURLParams({
                    skip: Math.max(0, skip - limit).toString(),
                  })
                }
              >
                이전
              </Button>
              <Button
                disabled={skip + limit >= total}
                onClick={() =>
                  updateURLParams({
                    skip: (skip + limit).toString(),
                  })
                }
              >
                다음
              </Button>
            </div>
          </div>
        </div>
      </CardContent>

      {/* 게시물 추가 대화상자 */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>새 게시물 추가</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="제목"
              value={newPost.title}
              onChange={(e) => setNewPost({ ...newPost, title: e.target.value })}
            />
            <Textarea
              rows={30}
              placeholder="내용"
              value={newPost.body}
              onChange={(e) => setNewPost({ ...newPost, body: e.target.value })}
            />
            <Input
              type="number"
              placeholder="사용자 ID"
              value={newPost.userId}
              onChange={(e) => setNewPost({ ...newPost, userId: Number(e.target.value) })}
            />
            <Button onClick={addPost}>게시물 추가</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 게시물 수정 대화상자 */}
      <Dialog
        open={!!selectedPostId}
        onOpenChange={(open) => {
          if (!open) {
            updateURLParams({ selectedPostId: null, mode: null })
          }
        }}
      >
        <DialogContent className={mode === "detail" ? "max-w-3xl" : ""}>
          <DialogHeader>
            <DialogTitle>
              {mode === "edit" ? "게시물 수정" : highlightText(selectedPost?.title ?? "", searchQuery)}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {mode === "edit" ? (
              // 편집 모드 UI
              <>
                <Input
                  placeholder="제목"
                  value={selectedPost?.title || ""}
                  onChange={(e) => {
                    if (!selectedPost) return
                    updatePostMutation.mutate({
                      id: selectedPost.id,
                      post: {
                        ...selectedPost,
                        title: e.target.value,
                      },
                    })
                  }}
                />
                <Textarea
                  rows={15}
                  placeholder="내용"
                  value={selectedPost?.body || ""}
                  onChange={(e) => {
                    if (!selectedPost) return
                    updatePostMutation.mutate({
                      id: selectedPost.id,
                      post: {
                        ...selectedPost,
                        body: e.target.value,
                      },
                    })
                  }}
                />
                <Button onClick={updatePost} disabled={updatePostMutation.isPending}>
                  {updatePostMutation.isPending ? "업데이트 중..." : "게시물 업데이트"}
                </Button>
              </>
            ) : (
              // 상세 보기 모드 UI
              <div className="overflow-hidden">
                <p className="break-words">{highlightText(selectedPost?.body ?? "", searchQuery)}</p>
                {renderComments()}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showAddCommentDialog} onOpenChange={setShowAddCommentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>새 댓글 추가</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              placeholder="댓글 내용"
              value={newComment.body}
              onChange={(e) => setNewComment({ ...newComment, body: e.target.value })}
            />
            <Button onClick={addComment} disabled={addCommentMutation.isPending}>
              {addCommentMutation.isPending ? "추가 중..." : "댓글 추가"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 댓글 수정 대화상자 */}
      <Dialog open={showEditCommentDialog} onOpenChange={setShowEditCommentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>댓글 수정</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              placeholder="댓글 내용"
              value={selectedComment?.body || ""}
              onChange={(e) => setSelectedComment({ ...selectedComment, body: e.target.value })}
            />
            <Button onClick={updateComment}>댓글 업데이트</Button>
          </div>
        </DialogContent>
      </Dialog>

      <UserProfileModal isOpen={isOpen} onClose={handleClose} user={user} />
    </Card>
  )
}

export default PostsManager
