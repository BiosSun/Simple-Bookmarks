(function() {
    'use strict';

    var

    storageData,

    B = {
        init: function(callback) {
            chrome.storage.local.get(function(items) {
                storageData = items;

                $(function() {
                    callback();
                });
            });
        },
        // 在当前标签页中打开页面
        openBookmarkCurrentTab: function(url, isClose){
            chrome.tabs.getSelected(null, function(tab){
                chrome.tabs.update(tab.id, {
                    url: url
                });

                if (isClose) { setTimeout(window.close, 200); }
            });
        },

        // 在新的标签页中打开页面
        openBookmarksNewTab: function(url, isClose) {
            chrome.tabs.getSelected(null, function() {
                chrome.tabs.create({
                    url: url
                });

                if (isClose) { setTimeout(window.close, 200); }
            });
        },

        openBookmarksNewWindow: function(url, isIncognito) {
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
        }
    };

    window.simpleBookmarks = B;

})();
