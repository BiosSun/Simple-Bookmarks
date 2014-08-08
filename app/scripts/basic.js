(function() {
    'use strict';

    var simpleBookmarks = {
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
                        simpleBookmarks._traversalBookmarkNode(node, nodefc);
                    });
                }
                else {
                    simpleBookmarks._traversalBookmarkNode(results, nodefc);
                }
            });
        },

        _traversalBookmarkNode: function(node, callback) {
            if (node.title) {
                callback(node);
            }

            if (node.children) {
                $.each(node.children, function(i, node) {
                    simpleBookmarks._traversalBookmarkNode(node, callback);
                });
            }
        },

        // 判断所传入的节点是否有效
        isCorrectNode: function(node) {
            return !!node.title;
        }
    };

    window.simpleBookmarks = simpleBookmarks;

})();
