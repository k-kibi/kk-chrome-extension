class Character {
  constructor(callback) {
    this.nickname = '';
    this.icons = [];

    if (window.location.pathname === '/kk/a_chara.php') {
      this.parseDocument(document, callback);
    } else {
      chrome.storage.local.get(['nickname', 'icons'], (items) => {
        if (typeof items.nickname === 'undefined' || this.nickname === null) {
          this.fetchCharacter(callback);
          return;
        }
        this.nickname = items.nickname;
        this.icons = items.icons;
        callback(this);
      });
    }
  }

  fetchCharacter(callback) {
    fetch('/kk/a_chara.php', { credentials: 'include' })
      .then(response => response.text())
      .then(str => (new window.DOMParser()).parseFromString(str, 'text/html'))
      .then(doc => this.parseDocument(doc, callback));
  }

  parseDocument(doc, callback) {
    this.nickname = doc.querySelector('input[name="ai"]').getAttribute('value');
    doc.querySelectorAll('input[name^="in"]').forEach((input, i) => {
      this.icons.push(new Icon());
      if (input.value !== '') this.icons[i].name = input.value;
    });
    doc.querySelectorAll('input[name^="icon"]').forEach((input, i) => {
      if (input.value !== '') this.icons[i].url = input.value;
    });
    doc.querySelectorAll('input[name^="icai"]').forEach((input, i) => {
      if (input.value !== '') this.icons[i].speaker = input.value;
    });

    chrome.storage.local.set({'nickname': this.nickname, 'icons': this.icons}, () => {
      callback(this);
    });
  }
}


class Icon {
  constructor() {
    this.name = null;
    this.url = null;
    this.speaker = null;
  }
}


class MessagePreview {
  constructor(parentNode, character) {
    this.iconNo = null;
    this.rawText = null;
    this.letters = 0;
    this.lettersMax = 400;
    this.messageStructure = [];
    this.placeholder = '(ここにプレビューが表示されます。)';
    this.timerId = null;
    this.character = character;
    this.textInput = parentNode.querySelector('input[name^="se"]');
    this.iconSelect = parentNode.querySelector('select');
    this.previewArea = this.createPreviewArea();

    this.addEventListeners();
  }

  createPreviewArea() {
    let element = document.createElement('div');
    element.className = 'SE';
    element.textContent = this.placeholder;
    return element;
  }

  addEventListeners() {
    this.textInput.addEventListener('focus', this.startMonitoring.bind(this));
    this.textInput.addEventListener('blur', this.endMonitoring.bind(this));
    this.iconSelect.addEventListener('change', this.monitorIconNo.bind(this));
  }

  init() {
    let text = this.textInput.value;
    let iconNo = this.getIconNo();
    this.execute(iconNo, text);
  }

  startMonitoring() {
    this.endMonitoring();
    this.timerId = setInterval(() => {
      this.monitorInput();
    }, 200);
  }

  endMonitoring() {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  monitorInput() {
    let text = this.textInput.value;
    if (text != this.rawText) {
      this.execute(this.iconNo, text);
    }
  }

  getIconNo() {
    let numberString = this.iconSelect.value;
    if (numberString === '') {
      return 0;
    } else {
      return parseInt(numberString);
    }
  }

  monitorIconNo() {
    let iconNo = this.getIconNo();
    if (iconNo !== this.iconNo) {
      this.execute(iconNo, this.rawText);
    }
  }

  execute(iconNo, text) {
    this.iconNo = iconNo;
    this.rawText = text;
    let output = this.convert(text);
    this.render(output);
  }

  convert(source) {
    if (source === '') return null;

    let result = [];
    // ###で区切られた中からランダムに１つだけ発します。
    source.split('###').forEach((data, i) => {
      // +++で区切られたセリフを連続で発します。処理は###での区切りが先です。
      result[i] = [];
      data.split('+++').forEach((data, j) => {
        result[i][j] = this.buildMessage(data);
      });
    });

    return result;
  }

  buildMessage(source) {
    let message = new Message();
    let iconRegExp = /^\/(\d+)\//,
      speakerRegExp = /^@(.*?)@/,
      fontRegExp = /&lt;([FISU][1-7])&gt;.*&lt;\/[FISU][1-7]&gt;/,
      brRegExp = /&lt;BR&gt;/g;

    // HTMLタグをエスケープ
    source = source.replace(/</g, '&lt;').replace(/>/g, '&gt;');

    // /アイコン番号/ セリフのアイコンを変更します。発言者変更と同時に使う場合にはアイコン変更のほうを先に書きます。
    let result = iconRegExp.exec(source);
    if (result !== null) {
      let iconIndex = parseInt(result[1]);
      message.icon = this.character.icons[iconIndex];
      source = source.replace(iconRegExp, '');
    } else {
      message.icon = this.character.icons[this.iconNo];
    }

    // @発言者@ セリフの発言者名を変更します。@@とすると発言者名が消えて「」も消えます。
    result = speakerRegExp.exec(source);
    if (result !== null) {
      message.speaker = result[1];
      source = source.replace(speakerRegExp, '');
    } else {
      if (message.icon.speaker !== null) {
        message.speaker = message.icon.speaker;
      } else {
        message.speaker = this.character.nickname;
      }
    }

    // 文字装飾
    let pos = 0;
    while (result = fontRegExp.exec(source.substring(pos))) {
      let fontRegExp2 = new RegExp(`&lt;${result[1]}&gt;(.*)&lt;/${result[1]}&gt;`);
      let result2 = fontRegExp2.exec(source.substring(pos));
      if (result2 !== null) {
        source = source.replace(fontRegExp2, Util.decorativeTag(result[1], result2[1]));
      } else {
        pos += result.index + 1;
      }
    }

    // <BR> セリフの途中で改行します。
    message.text = source.replace(brRegExp, '<br>');
    return message;
  }

  render(data) {
    if (data === null) {
      this.previewArea.textContent = this.placeholder;
      return;
    }
    Util.toEmpty(this.previewArea);

    // 〜または〜
    for (let messages of data) {
      // 連続セリフ
      for (let message of messages) {
        let table = document.createElement('table');
        let tr = document.createElement('tr');
        tr.setAttribute('valign', 'top');
        let td = document.createElement('td');
        td.setAttribute('width', '60');
        td.appendChild(message.outputIcon());
        tr.appendChild(td);

        td = document.createElement('td');
        td.className = 'BG';
        td.innerHTML = message.outputText();
        tr.appendChild(td);
        table.appendChild(tr);

        this.previewArea.appendChild(table);
        this.previewArea.appendChild(Util.separator());
      }
      this.previewArea.removeChild(this.previewArea.lastChild);

      this.previewArea.appendChild(Util.separator('--- または ---'));
    }
    this.previewArea.removeChild(this.previewArea.lastChild);
  }
}

class TalkPreview {
  constructor(parentNode, character) {
    this.rawText = null;
    this.speaker = null;
    this.letters = 0;
    this.lettersMax = 300;
    this.placeholder = '(ここにプレビューが表示されます。)';
    this.timerId = null;
    this.character = character;
    this.textArea = parentNode.querySelector('textarea[name="mes"]');
    this.speakerInput = parentNode.querySelector('input[name="ai"]');
    this.previewArea = this.createPreviewArea();

    this.addEventListeners();
  }

  init() {
    this.rawText = this.textArea.value;
    this.speaker = this.speakerInput.value;
    this.execute();
  }

  addEventListeners() {
    this.textArea.addEventListener('focus', this.startMonitoring.bind(this));
    this.textArea.addEventListener('blur', this.endMonitoring.bind(this));
    this.speakerInput.addEventListener('change', this.getSpeaker.bind(this));
  }

  createPreviewArea() {
    let element = document.createElement('div');
    element.className = 'SY';

    this.view = document.createElement('div');
    this.view.className = 'B2';
    this.view.style = 'margin-left:62px';
    this.view.textContent = this.placeholder;
    element.appendChild(this.view);

    return element;
  }

  startMonitoring() {
    this.endMonitoring();
    this.timerId = setInterval(() => {
      this.monitorInput();
    }, 200);
  }

  endMonitoring() {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  monitorInput() {
    let text = this.textArea.value;
    if (text !== this.rawText) {
      this.rawText = text;
      this.execute();
    }
  }

  getSpeaker() {
    let speaker = this.speakerInput.value;
    if (speaker !== this.speaker) {
      this.speaker = speaker;
      this.execute();
    }
  }

  execute() {
    let message = this.buildMessage(this.rawText, this.speaker);
    this.render(message);
  }

  buildMessage(source, speaker) {
    if (source === '') return null;

    let message = new Message();
    let fontRegExp = /&lt;([FISU][1-7])&gt;.*&lt;\/[FISU][1-7]&gt;/;

    // HTMLタグをエスケープ
    source = source.replace(/</g, '&lt;').replace(/>/g, '&gt;');

    // 文字装飾
    let pos = 0, result;
    while (result = fontRegExp.exec(source.substring(pos))) {
      let fontRegExp2 = new RegExp(`&lt;${result[1]}&gt;(.*)&lt;/${result[1]}&gt;`);
      let result2 = fontRegExp2.exec(source.substring(pos));
      if (result2 !== null) {
        source = source.replace(fontRegExp2, Util.decorativeTag(result[1], result2[1]));
      } else {
        pos += result.index + 1;
      }
    }

    message.speaker = speaker;
    message.text = source.replace('\n', '<br>');
    return message;
  }

  render(message) {
    if (message === null) {
      this.view.textContent = this.placeholder;
      return;
    }
    this.view.innerHTML = message.outputText();
  }
}

class Message {
  constructor() {
    this.icon = null;
    this.speaker = null;
    this.text = null;
  }

  outputIcon() {
    let img = document.createElement('img');
    if (this.icon.url === null) {
      img.setAttribute('src', '/kk/p/np2.gif');
    } else {
      img.setAttribute('src', this.icon.url);
    }
    img.className = 'IC';
    return img;
  }

  outputText() {
    // 発言者タグで @@ を指定した場合は「」を外す
    if (this.speaker === '') {
      return this.text;
    } else {
      return `${this.speaker}<br>「${this.text}」`;
    }
  }
}


class StagingPreview {
  constructor(parentNode) {
    this.rawUrl = null;
    this.imageUrlInput = parentNode.querySelector('input[name^="en"]');

    this.previewArea = this.createPreviewArea();
    this.imageUrlInput.addEventListener('blur', this.monitorInput.bind(this));
  }

  init() {
    this.monitorInput();
  }

  monitorInput() {
    let url = this.imageUrlInput.value;
    if (url !== this.rawUrl) {
      let images = this.convert(url);
      this.render(images);
    }
  }

  convert(source) {
    let images = [];
    // 各演出画像の設定はURLを複数設定できます。複数設定する場合は ### で区切ってください。
    let heightRegExp = /@(\d+)$/, urlRegExp = /^https?:\/\//;
    for (let str of source.split('###')) {
      // 演出画像URLのすぐ後に、例えば @300 と付けることで高さ300pxで表示できます。
      let staging = new Staging();
      let result = heightRegExp.exec(str);
      if (result !== null) {
        let h = parseInt(result[1]);
        if (0 < h && h <= 600) {
          staging.height = h;
        }
        str = str.replace(heightRegExp, '');
      }
      if (!urlRegExp.test(str)) continue;
      staging.url = str;

      images.push(staging);
    }

    return images;
  }

  render(images) {
    Util.toEmpty(this.previewArea);
    for (let image of images) {
      let img = document.createElement('img');
      img.setAttribute('src', image.url);
      img.setAttribute('width', '600');
      img.setAttribute('height', image.height);
      this.previewArea.appendChild(img);
      this.previewArea.appendChild(Util.separator('--- または ---'));
    }
    if (this.previewArea.lastChild) this.previewArea.removeChild(this.previewArea.lastChild);
  }

  createPreviewArea() {
    let element = document.createElement('div');
    element.className = 'SY';
    return element;
  }
}



class SkillSerifMemo {
  constructor(parentNode) {
    this.parentNode = parentNode;
    this.skillSelect = null;
    this.serifInput = null;
    this.stagingInput = null;
    this.iconSelect = null;
    this.skill = null;
    this.skills = [];
  }

  init() {
    let td = this.parentNode.parentNode.nextSibling.nextSibling.querySelector('td');
    this.serifInput = td.querySelector('input[name^="se"]');
    this.stagingInput = td.querySelector('input[name^="en"]');
    this.iconSelect = td.querySelector('select[name^="ic"]');
    this.skillSelect = this.parentNode.querySelector('select[name^="ss"]');
    for (let option of this.skillSelect.querySelectorAll('option')) {
      this.skills.push(new Skill(parseInt(option.value), option.textContent));
    }
    this.skillSelect.addEventListener('change', this.getSkill.bind(this));
    this.getSkill();

    let div = document.createElement('div');
    div.appendChild(this.createSaveButton());
    div.appendChild(this.createLoadButton());
    td.insertBefore(div, td.firstChild);
  }

  getSkill() {
    this.skill = this.skills[this.skillSelect.selectedIndex];
  }

  createLoadButton() {
    let button = document.createElement('input');
    button.setAttribute('type', 'button');
    button.className = 'BUT';
    button.value = 'このスキルのセリフをロード';
    button.addEventListener('click', (event) => {
      this.loadData(this.skill);
    });
    return button;
  }

  createSaveButton() {
    let button = document.createElement('input');
    button.setAttribute('type', 'button');
    button.className = 'BUT';
    button.value = 'このスキルのセリフをセーブ';
    button.addEventListener('click', (event) => {
      this.saveData(this.skill, this.serifInput.value, this.stagingInput.value, this.iconSelect.selectedIndex);
    });
    return button;
  }

  loadData(skill) {
    let key = `skill_${skill.id}`;
    chrome.storage.local.get([`${key}_serif`, `${key}_staging`, `${key}_icon`], (data) => {
      if (typeof data[`${key}_serif`] === 'undefined') {
        alert('このスキルのセリフは保存されていません。');
        return;
      }
      this.serifInput.value = data[`${key}_serif`];
      this.stagingInput.value = data[`${key}_staging`];
      this.iconSelect.selectedIndex = data[`${key}_icon`];
      this.serifInput.focus();
    });
  }

  saveData(skill, serif, staging, iconIndex) {
    let key = `skill_${skill.id}`;
    let data = {};
    data[`${key}_serif`] = serif;
    data[`${key}_staging`] = staging;
    data[`${key}_icon`] = iconIndex;
    chrome.storage.local.set(data, () => {
      alert(`${skill.name}のセリフをセーブしました。`);
    });
  }
}

class Skill {
  constructor(id, name) {
    this.id = id;
    this.name = name;
  }
}

class Staging {
  constructor() {
    this.url = null;
    this.height = 200;
  }
}

class ClassifySkill {
  static sort() {
    let table = document.querySelector('table.LST tbody');
    let trs = Array.from(table.querySelectorAll('tr:not(.LG):not(.B2)')).map((tr, i) => {
      let index, result, sp, ownership;
      switch(tr.querySelectorAll('td')[1].className) {
        case 'B2':
          ownership = 1;
          break;
        case 'Y2':
          ownership = 2;
          break;
        default:
          ownership = 0;
      }
      let tdDesc = tr.querySelectorAll('td')[3];
      let type = tdDesc.className === 'B2' ? 0 : 1;
      let desc = tdDesc.querySelector('b').textContent;
      if (type === 0) {
        // active skill
        result = /【(.+):SP(\d+)】/.exec(desc);
        index = ClassifySkill.activeTiming.indexOf(result[1]);
        sp = parseInt(result[2]);
      } else {
        // passive skill
        result = /【(.+)】/.exec(desc);
        index = ClassifySkill.passiveTiming.indexOf(result[1]);
        sp = 0;
      }
      let desc2 = tdDesc.childNodes[1].textContent;
      result = /^(.+?)(\d*?):/.exec(desc2);
      let target = ClassifySkill.target.indexOf(result[1]);
      let times = result[2] ? parseInt(result[2]) : 1;

      return { elm: tr, index: i, ownership: ownership, type: type, timing: index, sp: sp, target: target, times: times };
    });

    let df = document.createDocumentFragment();
    let tweets = table.querySelectorAll('tr.LG');
    trs.sort(ClassifySkill.compare).forEach((tr, index) => {
      if (tr.ownership !== 0) {
        tr.elm.querySelector('input[name^="jn_"]').value = index;
      }
      df.appendChild(tr.elm);
      df.appendChild(tweets[tr.index]);
    });

    table.appendChild(df);
  }

  static compare(a, b) {
    if (a.ownership !== b.ownership) return a.ownership - b.ownership;

    if (a.type !== b.type) return a.type - b.type;

    if (a.timing !== b.timing) return a.timing - b.timing;

    if (a.type === 0 && a.sp !== b.sp) return a.sp - b.sp;

    if (a.target !== b.target) return a.target - b.target;

    return a.times - b.times;
  }
}

/** @see http://wikiwiki.jp/ktst/?%A5%B9%A5%AD%A5%EB%BB%C5%CD%CD%BE%DC%BA%D9 */
ClassifySkill.activeTiming = [
  '通常時',
  '自分重傷', '味方重傷', 'PT重傷',
  '4行動毎', '5行動毎', '9行動毎', '16行動毎', '28行動毎',
  '味方3人以上', '味方4人以上',
  '敵3人以上', '敵4人以上',
  '自分異常状態', '自分強化状態',
  '味方異常状態', '味方強化状態'
];

ClassifySkill.passiveTiming = [
  '戦闘開始時', '戦闘離脱時', 'ターン開始時', '自分行動前',
  'スキル使用後', 'リンクスキル後', 'HP回復後', '被HP回復後',
  '通常攻撃後', '攻撃命中後', 'クリティカル後', '被攻撃回避後',
  '被攻撃命中後', '被クリティカル後', '攻撃回避後'
];

ClassifySkill.target = [
  '自',
  '味', '味列', '味貫', '味全', '味傷', '味異', '味強',
  '敵', '敵列', '敵貫', '敵全', '敵傷', '敵異', '敵強',
  '敵味', '敵味列', '敵味貫', '敵味全', '敵味傷', '敵味異', '敵味強',
  '他', '他列', '他貫', '他全', '他傷', '他異', '他強'
];



class SkillDraggable {
  constructor(table, row, index) {
    this.table = table.querySelector('tbody');
    this.row = row;
    this.index = index;

    this.row.setAttribute('draggable', 'true');
    this.addEvents();
  }

  addEvents() {
    this.row.addEventListener('dragstart', this.handleDragStart.bind(this));
    this.row.addEventListener('dragenter', this.handleDragEnter.bind(this));
    this.row.addEventListener('dragover', this.handleDragOver.bind(this));
    this.row.addEventListener('dragleave', this.handleDragLeave.bind(this));
    this.row.addEventListener('drop', this.handleDrop.bind(this));
    this.row.addEventListener('dragend', this.handleDragEnd.bind(this));
  }

  handleDragStart(event) {
    this.row.classList.add('dragging');

    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text', this.index);
  }

  handleDragEnter(event) {
    this.row.classList.add('over');
  }

  handleDragLeave(event) {
    this.row.classList.remove('over');
  }

  handleDragOver(event) {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    return false;
  }

  handleDragEnd(event) {
    this.row.classList.remove('dragging');
  }

  handleDrop(event) {
    event.stopPropagation();
    this.row.classList.remove('over');

    // スキル並べ替え
    let draggedIndex = parseInt(event.dataTransfer.getData('text'));
    if (draggedIndex !== this.index) {
      let rows = this.table.querySelectorAll('tr[draggable="true"]');
      let draggedRow = rows[draggedIndex];
      let serifRow = draggedRow.nextElementSibling;

      this.table.insertBefore(draggedRow, this.row);
      this.table.insertBefore(serifRow, this.row);

      // 順番設定数を上から順に埋める
      this.table.querySelectorAll('tr[draggable="true"]').forEach((row, index) => {
        row.querySelector('input[type="text"]').value = (index + 1) * 10;
      });
    }

    event.dataTransfer.clearData('text');
    return false;
  }
}



class Util {
  static toEmpty(dom) {
    while (dom.firstChild) {
      dom.removeChild(dom.firstChild);
    }
  }

  static separator(textNode = null) {
    let separator = document.createElement('div');
    separator.className = 'CL';
    if (textNode !== null) separator.textContent = textNode;
    return separator;
  }

  static decorativeTag(tag, content) {
    let tagType;
    switch (tag[0]) {
      case 'F':
        tagType = 'b';
        break;
      case 'I':
        tagType = 'i';
        break;
      case 'S':
        tagType = 's';
        break;
      case 'U':
        tagType = 'u';
        break;
    }
    return `<${tagType} class="F${tag[1]}">${content}</${tagType}>`;
  }
}
