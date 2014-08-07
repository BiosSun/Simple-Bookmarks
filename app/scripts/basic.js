(function() {
    'use strict';

    var simpleBookmarks = {

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
