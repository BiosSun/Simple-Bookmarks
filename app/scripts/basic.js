(function() {
    'use strict';

    var

    doc = $(document),

    _rspace = /\s/g,
    _rseparator = /[\s-]/g,

    storageData,

    B = {
        // 根书签目录节点的 ID
        rootFolderId: '0',

        defSeparator: '- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - ',

        init: function(callback) {
            chrome.storage.local.get(function(sd) {
                $(function() {
                    storageData = sd;
                    callback();
                });
            });
        },

        // 复制并扩展节点对象的内容到一个新的对象中
        extendNode: function(node) {
            var descIndex;

            node = $.extend({}, node);

            if (B.isSeparatorBookmark(node)) {
                node.isSeparatorBookmark = true;
                node.title = B.getSeparatorTitle(node);
            }

            descIndex = node.title.indexOf('##');
            if (descIndex !== -1) {
                node.desc = node.title.substring(descIndex + 2);
                node.title = node.title.substring(0, descIndex);
            }

            return node;
        },

        // 恢复对节点对象的扩展的内容
        unextendNode: function(node) {
            node = $.extend({}, node);

            if (node.isSeparatorBookmark) {
                node.title = B.defSeparator + node.title;
                delete node.isSeparatorBookmark;
            }

            if (node.desc) {
                node.title += '##' + node.desc;
                delete node.desc;
            }

            return node;
        },

        // 更新节点对象
        update: function(node, callback) {
            node = B.unextendNode(node);

            var id = node.id,
                data = {
                    title: node.title,
                    url: node.url
                };
            chrome.bookmarks.update(id, data, callback);
        },

        // 在当前标签页中打开页面
        openUrlInCurrentTab: function(url, isClose){
            chrome.tabs.getSelected(null, function(tab){
                chrome.tabs.update(tab.id, {
                    url: url
                });

                if (isClose) { setTimeout(window.close, 200); }
            });
        },

        // 在新的标签页中打开页面
        openUrlInNewTab: function(url, isClose) {
            if (typeof url === 'string') {
                basic(function() {
                    chrome.tabs.create({ url: url });
                });
            }
            // is array
            else {
                basic(function() {
                    for (var i = 0, l = url.length; i < l; i++) {
                        chrome.tabs.create({ url: url[i] });
                    }
                });
            }

            function basic(callback) {
                chrome.tabs.getSelected(null, function() {
                    callback();
                    if (isClose) { setTimeout(window.close, 200); }
                });
            }
        },

        // 在新的窗口中打开页面
        openUrlInNewWindow: function(url, isIncognito) {
            chrome.windows.create({
                url: url,
                incognito: isIncognito
            });
        },

        get: function(ids, callback) {
            if (typeof ids !== 'string' && !$.isArray(ids)) {
                ids = ids + '';
            }

            chrome.bookmarks.get(ids, function(nodes) {
                if ( $.isArray(nodes) ) {
                    for (var i = 0, l = nodes.length; i < l; i++) {
                        nodes[i] = B.extendNode(nodes[i]);
                    }
                }

                callback(nodes);
            });
        },

        getChildren: function(folderId, callback) {
            chrome.bookmarks.getChildren(folderId + '', function(nodes) {
                if ( $.isArray(nodes) ) {
                    for (var i = 0, l = nodes.length; i < l; i++) {
                        nodes[i] = B.extendNode(nodes[i]);
                    }
                }

                callback(nodes);
            });
        },

        // 获取指定书签目录下所有子书签的 url
        getChildrenUrls: function(folderId, callback) {
            chrome.bookmarks.getChildren(folderId, function(nodes) {
                var urls = [], node;

                for (var i = 0, l = nodes.length; i < l; i++) {
                    node = nodes[i];
                    if (node.url && !B.isSeparatorBookmark(node)) {
                        urls.push(node.url);
                    }
                }

                callback(urls);
            });
        },

        // 判断是否是分隔符书签
        isSeparatorBookmark: function(node) {
            return node.title.replace(_rspace, '').substring(0, 5) === '-----';
        },

        // 获取分隔符书签的标题
        getSeparatorTitle: function(node) {
            return node.title.replace(_rseparator, '');
        },

        // 判断所传入的节点是否有效
        isCorrectNode: function(node) {
            return !!node.title;
        },

        // 一个简单的本地存储接口
        storage: function(key, val) {
            var setObj;

            // get
            if (arguments.length === 1) {
                return storageData[key];
            }
            // remove
            else if (val === undefined) {
                delete storageData[key];
                chrome.storage.local.remove(key);
            }
            // set
            else {
                storageData[key] = val;

                setObj = {};
                setObj[key] = val;
                chrome.storage.local.set(setObj);
            }

            // default result undefined
            return undefined;
        },

        // 显示顶部查询面板，同时隐藏在显示的其它面板
        showSearchPanel: function() {
            var fixedTop    = $('#fixed-top'),
                searchPanel = fixedTop.find('> .search-panel'),
                showPanel   = fixedTop.find('> .fixed-top-panel:visible');

            searchPanel.slideDown(200);
            showPanel.slideUp(200);
        },

        // 隐藏顶部查询面板，同时显示一个其它面板
        hideSearchPanel: function(showPanel) {
            var fixedTop    = $('#fixed-top'),
                searchPanel = fixedTop.find('> .search-panel');

            searchPanel.slideUp(200);
            showPanel.slideDown(200);
        },

        // 显示一个确认提示
        confirm: function(message, callback) {
            var confirmPanel = $('#fixed-top .confirm-panel');

            confirmPanel.find('> p').text(message);

            confirmPanel.off('click.confirm');
            confirmPanel.on('click.confirm', '.confirm', callback);
            confirmPanel.on('click.confirm', '.cancel', function() {
                B.showSearchPanel();
            });

            B.hideSearchPanel(confirmPanel);

            confirmPanel.find('.confirm')[0].focus();
        },

        // 显示一个编辑表单
        edit: function(node, callback) {
            var editPanel  = $('#fixed-top .edit-panel'),

                titleGroup = editPanel.find('.form-group:has([name=title])'),
                descGroup  = editPanel.find('.form-group:has([name=desc])'),
                urlGroup   = editPanel.find('.form-group:has([name=url])'),

                titleInput = titleGroup.find('.form-control'),
                descInput  = descGroup.find('.form-control'),
                urlInput   = urlGroup.find('.form-control'),

                submitBtn  = editPanel.find('.submit');

            titleInput.val('');
            descInput.val('');
            urlInput.val('');

            if (node.isSeparatorBookmark) {
                titleGroup.show();
                descGroup.hide();
                urlGroup.hide();
                titleInput.val(node.title);
            }
            else if (node.url) {
                titleGroup.show();
                descGroup.show();
                urlGroup.show();
                titleInput.val(node.title);
                descInput.val(node.desc);
                urlInput.val(node.url);
            }
            else {
                titleGroup.show();
                descGroup.show();
                urlGroup.hide();
                titleInput.val(node.title);
                descInput.val(node.desc);
            }

            editPanel.off('.edit');

            editPanel.on('click.edit', '.cancel', function() {
                B.showSearchPanel();
            });

            editPanel.on('submit.edit', function() {
                $.extend(node, {
                    title: $.trim(titleInput.val()),
                    desc: $.trim(descInput.val()),
                    url: $.trim(urlInput.val()) || undefined
                });
                B.update(node, function() {
                    B.showSearchPanel();
                    callback(node);
                    doc.trigger('bm.update', node);
                });

                return false;
            });

            submitBtn.text('修改');
            B.hideSearchPanel(editPanel);
            titleInput.focus();
        }
    };

    window.simpleBookmarks = B;

})();
