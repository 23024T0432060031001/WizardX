import static com.google.gerrit.server.patch.DiffUtil.removePatchHeader;
  @Test
  public void applyPatchWithConflict_appendErrorsToCommitMessage() throws Exception {
    initBaseWithFile(MODIFIED_FILE_NAME, "Unexpected base content");
    String patch = ADDED_FILE_DIFF + MODIFIED_FILE_DIFF;
    ApplyPatchPatchSetInput in = buildInput(patch);
    in.commitMessage = "subject";

    ChangeInfo result = applyPatch(in);

    assertThat(gApi.changes().id(result.id).current().commit(false).message)
        .isEqualTo(
            in.commitMessage
                + "\n\nNOTE FOR REVIEWERS - errors occurred while applying the patch."
                + "\nPLEASE REVIEW CAREFULLY.\nErrors:\nError applying patch in "
                + MODIFIED_FILE_NAME
                + ", hunk HunkHeader[1,2->1,1]: Hunk cannot be applied\n\nOriginal patch:\n "
                + removePatchHeader(patch)
                + "\n\nChange-Id: "
                + result.changeId
                + "\n");
    // Error in MODIFIED_FILE should not affect ADDED_FILE results.
    DiffInfo diff = fetchDiffForFile(result, ADDED_FILE_NAME);
    assertDiffForNewFile(diff, result.currentRevision, ADDED_FILE_NAME, ADDED_FILE_CONTENT);
  }

    assertThat(cleanPatch(resultPatch)).isEqualTo(cleanPatch(ADDED_FILE_DIFF));