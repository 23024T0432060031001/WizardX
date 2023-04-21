// Copyright (C) 2015 The Android Open Source Project
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package com.google.gerrit.server.submit;

import com.google.common.base.Strings;
import com.google.common.flogger.FluentLogger;
import com.google.gerrit.common.Nullable;
import com.google.gerrit.entities.Change;
import com.google.gerrit.entities.Project;
import com.google.gerrit.server.CurrentUser;
import com.google.gerrit.server.IdentifiedUser;
import com.google.gerrit.server.change.NotifyResolver;
import com.google.gerrit.server.config.SendEmailExecutor;
import com.google.gerrit.server.mail.EmailModule.MergedChangeEmailFactories;
import com.google.gerrit.server.mail.send.ChangeEmailNew;
import com.google.gerrit.server.mail.send.MessageIdGenerator;
import com.google.gerrit.server.mail.send.OutgoingEmailNew;
import com.google.gerrit.server.update.RepoView;
import com.google.gerrit.server.util.RequestContext;
import com.google.gerrit.server.util.ThreadLocalRequestContext;
import com.google.inject.Inject;
import com.google.inject.OutOfScopeException;
import com.google.inject.assistedinject.Assisted;
import java.util.Optional;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Future;

class EmailMerge implements Runnable, RequestContext {
  private static final FluentLogger logger = FluentLogger.forEnclosingClass();

  interface Factory {
    EmailMerge create(
        Project.NameKey project,
        Change change,
        IdentifiedUser submitter,
        NotifyResolver.Result notify,
        RepoView repoView,
        String stickyApprovalDiff);
  }

  private final ExecutorService sendEmailsExecutor;
  private final MergedChangeEmailFactories mergedChangeEmailFactories;
  private final ThreadLocalRequestContext requestContext;
  private final MessageIdGenerator messageIdGenerator;

  private final Project.NameKey project;
  private final Change change;
  private final IdentifiedUser submitter;
  private final NotifyResolver.Result notify;
  private final RepoView repoView;
  private final String stickyApprovalDiff;

  @Inject
  EmailMerge(
      @SendEmailExecutor ExecutorService executor,
      MergedChangeEmailFactories mergedChangeEmailFactories,
      ThreadLocalRequestContext requestContext,
      MessageIdGenerator messageIdGenerator,
      @Assisted Project.NameKey project,
      @Assisted Change change,
      @Assisted @Nullable IdentifiedUser submitter,
      @Assisted NotifyResolver.Result notify,
      @Assisted RepoView repoView,
      @Assisted String stickyApprovalDiff) {
    this.sendEmailsExecutor = executor;
    this.mergedChangeEmailFactories = mergedChangeEmailFactories;
    this.requestContext = requestContext;
    this.messageIdGenerator = messageIdGenerator;
    this.project = project;
    this.change = change;
    this.submitter = submitter;
    this.notify = notify;
    this.repoView = repoView;
    this.stickyApprovalDiff = stickyApprovalDiff;
  }

  void sendAsync() {
    @SuppressWarnings("unused")
    Future<?> possiblyIgnoredError = sendEmailsExecutor.submit(this);
  }

  @Override
  public void run() {
    RequestContext old = requestContext.setContext(this);
    try {
      ChangeEmailNew changeEmail =
          mergedChangeEmailFactories.createChangeEmail(
              project,
              change.getId(),
              Optional.ofNullable(Strings.emptyToNull(stickyApprovalDiff)));
      OutgoingEmailNew outgoingEmail = mergedChangeEmailFactories.createEmail(changeEmail);
      if (submitter != null) {
        outgoingEmail.setFrom(submitter.getAccountId());
      }
      outgoingEmail.setNotify(notify);
      outgoingEmail.setMessageId(
          messageIdGenerator.fromChangeUpdate(repoView, change.currentPatchSetId()));
      outgoingEmail.send();
    } catch (Exception e) {
      logger.atSevere().withCause(e).log("Cannot email merged notification for %s", change.getId());
    } finally {
      requestContext.setContext(old);
    }
  }

  @Override
  public String toString() {
    return "send-email merged";
  }

  @Override
  public CurrentUser getUser() {
    if (submitter != null) {
      return submitter;
    }
    throw new OutOfScopeException("No user on email thread");
  }
}
