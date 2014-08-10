(function() {
    'use strict';

    var

    _rspace = /\s/g,

    storageData,

    B = {
        // 根书签目录节点的 ID
        rootFolderId: '0',

        init: function(callback) {
            chrome.storage.local.get(function(sd) {
                $(function() {
                    storageData = sd;
                    callback();
                });
            });
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

        // 遍历书签
        traversalBookmarks: function(nodefc) {
            chrome.bookmarks.getTree(function(results) {
                if ($.isArray(results)) {
                    $.each(results, function(i, node) {
                        B._traversalBookmarkNode(node, nodefc);
                    });
                }
                else {
                    B._traversalBookmarkNode(results, nodefc);
                }
            });
        },

        _traversalBookmarkNode: function(node, callback) {
            if (node.title) {
                callback(node);
            }

            if (node.children) {
                $.each(node.children, function(i, node) {
                    B._traversalBookmarkNode(node, callback);
                });
            }
        },

        isSeparatorBookmark: function(node) {
            return node.title.replace(_rspace, '').substring(0, 5) === '-----';
        },

        // 获取指定书签目录下所有子书签的 url
        getChildrenUrls: function(id, callback) {
            chrome.bookmarks.getChildren(id, function(nodes) {
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
        }
    };

    window.simpleBookmarks = B;

})();
