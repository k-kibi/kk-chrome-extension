let main = (character) => {
  // スキル使用設定の順番をドラッグ＆ドロップで変更
  document.querySelectorAll('table.TB2').forEach((table) => {
    let rowCount = table.querySelectorAll('tr.SED').length;
    table.querySelectorAll('tr:not(.SED)').forEach((tr, index) => {
      if (index < rowCount) {
        new SkillDraggable(table, tr, index);
      }
    });
  });

  // メッセージ＆演出画像のプレビュー
  document.querySelectorAll('tr.SED').forEach((tr, index, array) => {
    let td = tr.querySelector('td');
    let messagePreview = new MessagePreview(td, character);
    td.appendChild(messagePreview.previewArea);
    messagePreview.init();

    let stagingPreview = new StagingPreview(td);
    td.appendChild(stagingPreview.previewArea);
    stagingPreview.init();
  });

  // スキルのセリフをセーブ＆ロード
  for (let select of document.querySelectorAll('select[name^="ss"]')) {
    let td = select.parentNode;
    let ssm = new SkillSerifMemo(td);
    ssm.init();
  }

  // スキル一覧のソート機能
  let submitButton = document.querySelector('input[type="submit"][name="mode2"]');
  let sortButton = document.createElement('input');
  sortButton.setAttribute('type', 'button');
  sortButton.className = 'BUT2';
  sortButton.value = 'スキルをソートする';
  sortButton.addEventListener('click', () => {
    ClassifySkill.sort();
  });
  submitButton.parentNode.insertBefore(sortButton, submitButton);
};

new Character(main);
