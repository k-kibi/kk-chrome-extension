let main = (character) => {
  document.querySelectorAll('tr.SED').forEach((tr, index, array) => {
    let td = tr.querySelector('td');
    let messagePreview = new MessagePreview(td, character);
    td.appendChild(messagePreview.previewArea);
    messagePreview.init();

    let stagingPreview = new StagingPreview(td);
    td.appendChild(stagingPreview.previewArea);
    stagingPreview.init();
  });

  for (let select of document.querySelectorAll('select[name^="ss"]')) {
    let td = select.parentNode;
    let ssm = new SkillSerifMemo(td);
    ssm.init();
  }

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
