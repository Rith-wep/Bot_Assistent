"""Weekly Intelligence — nightly clustering job logic.

Groups one business's new (open, unclustered) unanswered_questions into
question_clusters with short bilingual labels, merging into that business's
existing open clusters where the topic already exists. See CLAUDE.md's
Weekly Intelligence section. The CLI loop over every business lives in
app/jobs/cluster_unanswered.py — this module only knows how to do one
business at a time, and raises on failure so the caller can isolate it.
"""
from sqlalchemy.orm import Session

from app.core.time import utcnow
from app.repositories.question_cluster import QuestionClusterRepository
from app.repositories.unanswered_question import UnansweredQuestionRepository
from app.services import ai

MAX_SAMPLE_QUESTIONS = 3


async def cluster_business(db: Session, business_id: int) -> int:
    """Cluster one business's new open questions. Returns how many
    questions were clustered (0 if there was nothing new to do — no AI
    call is made in that case).
    """
    question_repo = UnansweredQuestionRepository(db, business_id)
    cluster_repo = QuestionClusterRepository(db, business_id)

    new_questions = question_repo.list_open_unclustered()
    if not new_questions:
        return 0

    existing_clusters = cluster_repo.list_open()
    ai_existing = [
        {
            "index": i,
            "label_en": c.label_en,
            "label_km": c.label_km,
            "sample_questions": c.sample_questions or [],
        }
        for i, c in enumerate(existing_clusters)
    ]
    ai_new = [{"index": i, "text": q.question_text} for i, q in enumerate(new_questions)]

    groups = await ai.cluster_questions(ai_existing, ai_new)
    if groups is None:
        raise RuntimeError(f"business_id={business_id}: clustering AI call failed")

    now = utcnow()
    clustered_count = 0
    seen_indices: set[int] = set()

    for group in groups:
        indices = [
            i
            for i in group.get("question_indices", [])
            if isinstance(i, int) and 0 <= i < len(new_questions) and i not in seen_indices
        ]
        if not indices:
            continue
        seen_indices.update(indices)
        questions = [new_questions[i] for i in indices]

        existing_index = group.get("existing_cluster_index")
        if isinstance(existing_index, int) and 0 <= existing_index < len(existing_clusters):
            cluster = existing_clusters[existing_index]
        else:
            cluster = cluster_repo.create(
                label_en=(group.get("label_en") or "Untitled topic").strip(),
                label_km=(group.get("label_km") or "").strip(),
                question_count=0,
                sample_questions=[],
                first_seen=now,
                last_seen=now,
            )

        for question in questions:
            question.cluster_id = cluster.id

        cluster.question_count = (cluster.question_count or 0) + len(questions)
        cluster.last_seen = now
        samples = list(cluster.sample_questions or [])
        for question in questions:
            if len(samples) >= MAX_SAMPLE_QUESTIONS:
                break
            samples.append(question.question_text)
        cluster.sample_questions = samples

        clustered_count += len(questions)

    db.commit()
    return clustered_count
