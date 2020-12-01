/**
 * @license
 * Copyright (C) 2016 The Android Open Source Project
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import '../../../test/common-test-setup-karma.js';
import './gr-account-info.js';

const basicFixture = fixtureFromElement('gr-account-info');

suite('gr-account-info tests', () => {
  let element;
  let account;
  let config;

  function valueOf(title) {
    const sections = element.root.querySelectorAll('section');
    let titleEl;
    for (let i = 0; i < sections.length; i++) {
      titleEl = sections[i].querySelector('.title');
      if (titleEl.textContent === title) {
        return sections[i].querySelector('.value');
      }
    }
  }

  setup(done => {
    account = {
      _account_id: 123,
      name: 'user name',
      email: 'user@email',
      username: 'user username',
      registered: '2000-01-01 00:00:00.000000000',
    };
    config = {auth: {editable_account_fields: []}};

    stub('gr-rest-api-interface', {
      getAccount() { return Promise.resolve(account); },
      getConfig() { return Promise.resolve(config); },
      getPreferences() {
        return Promise.resolve({time_format: 'HHMM_12'});
      },
    });
    element = basicFixture.instantiate();
    // Allow the element to render.
    element.loadData().then(() => { flush(done); });
  });

  test('basic account info render', () => {
    assert.isFalse(element._loading);

    assert.equal(valueOf('ID').textContent, account._account_id);
    assert.equal(valueOf('Email').textContent, account.email);
    assert.equal(valueOf('Username').textContent, account.username);
  });

  test('full name render (immutable)', () => {
    const section = element.$.nameSection;
    const displaySpan = section.querySelectorAll('.value')[0];
    const inputSpan = section.querySelectorAll('.value')[1];

    assert.isFalse(element.nameMutable);
    assert.isFalse(displaySpan.hasAttribute('hidden'));
    assert.equal(displaySpan.textContent, account.name);
    assert.isTrue(inputSpan.hasAttribute('hidden'));
  });

  test('full name render (mutable)', () => {
    element.set('_serverConfig',
        {auth: {editable_account_fields: ['FULL_NAME']}});

    const section = element.$.nameSection;
    const displaySpan = section.querySelectorAll('.value')[0];
    const inputSpan = section.querySelectorAll('.value')[1];

    assert.isTrue(element.nameMutable);
    assert.isTrue(displaySpan.hasAttribute('hidden'));
    assert.equal(element.$.nameInput.bindValue, account.name);
    assert.isFalse(inputSpan.hasAttribute('hidden'));
  });

  test('username render (immutable)', () => {
    const section = element.$.usernameSection;
    const displaySpan = section.querySelectorAll('.value')[0];
    const inputSpan = section.querySelectorAll('.value')[1];

    assert.isFalse(element.usernameMutable);
    assert.isFalse(displaySpan.hasAttribute('hidden'));
    assert.equal(displaySpan.textContent, account.username);
    assert.isTrue(inputSpan.hasAttribute('hidden'));
  });

  test('username render (mutable)', () => {
    element.set('_serverConfig',
        {auth: {editable_account_fields: ['USER_NAME']}});
    element.set('_account.username', '');
    element.set('_username', '');

    const section = element.$.usernameSection;
    const displaySpan = section.querySelectorAll('.value')[0];
    const inputSpan = section.querySelectorAll('.value')[1];

    assert.isTrue(element.usernameMutable);
    assert.isTrue(displaySpan.hasAttribute('hidden'));
    assert.equal(element.$.usernameInput.bindValue, account.username);
    assert.isFalse(inputSpan.hasAttribute('hidden'));
  });

  suite('account info edit', () => {
    let nameChangedSpy;
    let usernameChangedSpy;
    let statusChangedSpy;
    let nameStub;
    let usernameStub;
    let statusStub;

    setup(() => {
      nameChangedSpy = sinon.spy(element, '_nameChanged');
      usernameChangedSpy = sinon.spy(element, '_usernameChanged');
      statusChangedSpy = sinon.spy(element, '_statusChanged');
      element.set('_serverConfig',
          {auth: {editable_account_fields: ['FULL_NAME', 'USER_NAME']}});

      nameStub = sinon.stub(element.restApiService, 'setAccountName').callsFake(
          name => Promise.resolve());
      usernameStub = sinon.stub(element.restApiService, 'setAccountUsername')
          .callsFake(username => Promise.resolve());
      statusStub = sinon.stub(element.restApiService,
          'setAccountStatus').callsFake(
          status => Promise.resolve());
    });

    test('name', done => {
      assert.isTrue(element.nameMutable);
      assert.isFalse(element.hasUnsavedChanges);

      element.set('_account.name', 'new name');

      assert.isTrue(nameChangedSpy.called);
      assert.isFalse(statusChangedSpy.called);
      assert.isTrue(element.hasUnsavedChanges);

      element.save().then(() => {
        assert.isFalse(usernameStub.called);
        assert.isTrue(nameStub.called);
        assert.isFalse(statusStub.called);
        nameStub.lastCall.returnValue.then(() => {
          assert.equal(nameStub.lastCall.args[0], 'new name');
          done();
        });
      });
    });

    test('username', done => {
      element.set('_account.username', '');
      element._hasUsernameChange = false;
      assert.isTrue(element.usernameMutable);

      element.set('_username', 'new username');

      assert.isTrue(usernameChangedSpy.called);
      assert.isFalse(statusChangedSpy.called);
      assert.isTrue(element.hasUnsavedChanges);

      element.save().then(() => {
        assert.isTrue(usernameStub.called);
        assert.isFalse(nameStub.called);
        assert.isFalse(statusStub.called);
        usernameStub.lastCall.returnValue.then(() => {
          assert.equal(usernameStub.lastCall.args[0], 'new username');
          done();
        });
      });
    });

    test('status', done => {
      assert.isFalse(element.hasUnsavedChanges);

      element.set('_account.status', 'new status');

      assert.isFalse(nameChangedSpy.called);
      assert.isTrue(statusChangedSpy.called);
      assert.isTrue(element.hasUnsavedChanges);

      element.save().then(() => {
        assert.isFalse(usernameStub.called);
        assert.isTrue(statusStub.called);
        assert.isFalse(nameStub.called);
        statusStub.lastCall.returnValue.then(() => {
          assert.equal(statusStub.lastCall.args[0], 'new status');
          done();
        });
      });
    });
  });

  suite('edit name and status', () => {
    let nameChangedSpy;
    let statusChangedSpy;
    let nameStub;
    let statusStub;

    setup(() => {
      nameChangedSpy = sinon.spy(element, '_nameChanged');
      statusChangedSpy = sinon.spy(element, '_statusChanged');
      element.set('_serverConfig',
          {auth: {editable_account_fields: ['FULL_NAME']}});

      nameStub = sinon.stub(element.restApiService, 'setAccountName').callsFake(
          name => Promise.resolve());
      statusStub = sinon.stub(element.restApiService,
          'setAccountStatus').callsFake(
          status => Promise.resolve());
      sinon.stub(element.restApiService, 'setAccountUsername').callsFake(
          username => Promise.resolve());
    });

    test('set name and status', done => {
      assert.isTrue(element.nameMutable);
      assert.isFalse(element.hasUnsavedChanges);

      element.set('_account.name', 'new name');

      assert.isTrue(nameChangedSpy.called);

      element.set('_account.status', 'new status');

      assert.isTrue(statusChangedSpy.called);

      assert.isTrue(element.hasUnsavedChanges);

      element.save().then(() => {
        assert.isTrue(statusStub.called);
        assert.isTrue(nameStub.called);

        assert.equal(nameStub.lastCall.args[0], 'new name');

        assert.equal(statusStub.lastCall.args[0], 'new status');

        done();
      });
    });
  });

  suite('set status but read name', () => {
    let statusChangedSpy;
    let statusStub;

    setup(() => {
      statusChangedSpy = sinon.spy(element, '_statusChanged');
      element.set('_serverConfig',
          {auth: {editable_account_fields: []}});

      statusStub = sinon.stub(element.restApiService,
          'setAccountStatus').callsFake(
          status => Promise.resolve());
    });

    test('read full name but set status', done => {
      const section = element.$.nameSection;
      const displaySpan = section.querySelectorAll('.value')[0];
      const inputSpan = section.querySelectorAll('.value')[1];

      assert.isFalse(element.nameMutable);

      assert.isFalse(element.hasUnsavedChanges);

      assert.isFalse(displaySpan.hasAttribute('hidden'));
      assert.equal(displaySpan.textContent, account.name);
      assert.isTrue(inputSpan.hasAttribute('hidden'));

      element.set('_account.status', 'new status');

      assert.isTrue(statusChangedSpy.called);

      assert.isTrue(element.hasUnsavedChanges);

      element.save().then(() => {
        assert.isTrue(statusStub.called);
        statusStub.lastCall.returnValue.then(() => {
          assert.equal(statusStub.lastCall.args[0], 'new status');
          done();
        });
      });
    });
  });

  test('_usernameChanged compares usernames with loose equality', () => {
    element._account = {};
    element._username = '';
    element._hasUsernameChange = false;
    element._loading = false;
    // _usernameChanged is an observer, but call it here after setting
    // _hasUsernameChange in the test to force recomputation.
    element._usernameChanged();
    flush();

    assert.isFalse(element._hasUsernameChange);

    element.set('_username', 'test');
    flush();

    assert.isTrue(element._hasUsernameChange);
  });

  test('_hideAvatarChangeUrl', () => {
    assert.equal(element._hideAvatarChangeUrl(''), 'hide');

    assert.equal(element._hideAvatarChangeUrl('https://example.com'), '');
  });
});

