import static java.util.stream.Collectors.toList;
import com.google.gerrit.reviewdb.client.Account;
import com.google.gerrit.reviewdb.client.Change;
import com.google.gerrit.reviewdb.client.PatchSet;
import com.google.gerrit.reviewdb.server.ReviewDb;
import com.google.gerrit.server.ApprovalsUtil;
import com.google.gerrit.server.notedb.NotesMigration;
import com.google.gwtorm.server.OrmException;
import java.util.stream.Stream;
    PushOneCommit create(ReviewDb db, PersonIdent i, TestRepository<?> testRepo);
        ReviewDb db,
        PersonIdent i,
        TestRepository<?> testRepo,
        @Assisted("changeId") String changeId);
        ReviewDb db,
        ReviewDb db,
        ReviewDb db,
  private final NotesMigration notesMigration;
  private final ReviewDb db;
      NotesMigration notesMigration,
      @Assisted ReviewDb db,
    this(
        notesFactory,
        approvalsUtil,
        queryProvider,
        notesMigration,
        db,
        i,
        testRepo,
        SUBJECT,
        FILE_NAME,
        FILE_CONTENT);
      NotesMigration notesMigration,
      @Assisted ReviewDb db,
        notesMigration,
        db,
      NotesMigration notesMigration,
      @Assisted ReviewDb db,
    this(
        notesFactory,
        approvalsUtil,
        queryProvider,
        notesMigration,
        db,
        i,
        testRepo,
        subject,
        fileName,
        content,
        null);
      NotesMigration notesMigration,
      @Assisted ReviewDb db,
    this(
        notesFactory,
        approvalsUtil,
        queryProvider,
        notesMigration,
        db,
        i,
        testRepo,
        subject,
        files,
        null);
      NotesMigration notesMigration,
      @Assisted ReviewDb db,
        notesMigration,
        db,
  private PushOneCommit(
      NotesMigration notesMigration,
      ReviewDb db,
      PersonIdent i,
      TestRepository<?> testRepo,
      String subject,
      Map<String, String> files,
      String changeId)
    this.db = db;
    this.notesMigration = notesMigration;
    public ChangeData getChange() throws OrmException {
    public PatchSet getPatchSet() throws OrmException {
    public PatchSet.Id getPatchSetId() throws OrmException {
        Change.Status expectedStatus, String expectedTopic, TestAccount... expectedReviewers)
        throws OrmException {
        List<TestAccount> expectedCcs)
        throws OrmException {
      if (notesMigration.readChanges()) {
        assertReviewers(c, ReviewerStateInternal.REVIEWER, expectedReviewers);
        assertReviewers(c, ReviewerStateInternal.CC, expectedCcs);
      } else {
        assertReviewers(
            c,
            ReviewerStateInternal.REVIEWER,
            Stream.concat(expectedReviewers.stream(), expectedCcs.stream()).collect(toList()));
      }
        Change c, ReviewerStateInternal state, List<TestAccount> expectedReviewers)
        throws OrmException {
          approvalsUtil.getReviewers(db, notesFactory.createChecked(db, c)).byState(state);
      assertThat(refUpdate.getStatus())
          .named(message(refUpdate))
      assertThat(refUpdate.getStatus()).named(message(refUpdate)).isEqualTo(expectedStatus);