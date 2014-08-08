$(function() {
    'use strict';

    var doc = $(document),

        bmRootList = $('#bookmarks'),
        bmItems = {};

    simpleBookmarks.traversalBookmarks(
        function(node) {
            var item = createBMItem(node);
            insertItem(item, true);
        }
    );

    doc.on('click', '.bm-item-title', function(e) {
        var itemEl = $(this).closest('.bm-item'),
            item = bmItems[itemEl.attr('data-id')],

            isCtrlMeta = e.ctrlKey || e.metaKey,
            isShift = e.shiftKey,

            url;

        if (itemEl.hasClass('bm-item-directory')) {
            toggleBMItem(item);
        }
        else if (itemEl.hasClass('bm-item-bookmark')) {
            url = item.data.url;

            if (isCtrlMeta) {
                simpleBookmarks.openBookmarksNewTab(url, true);
            }
            else if (isShift) {
                simpleBookmarks.openBookmarksNewWindow(url);
            }
            else {
                simpleBookmarks.openBookmarkCurrentTab(url, true);
            }
        }

        return false;
    });

    // 切换一个书签目录项的打开与关闭状态
    function toggleBMItem(item, sw) {
        if (sw || !item.isOpen) {
            openBMItem(item);
        }
        else {
            closeBMItem(item);
        }
    }

    // 打开一个书签目录项
    function openBMItem(item) {
        item.isOpen = true;
        item.el.addClass('open');

        if (item.sublistEl) {
            item.sublistEl.slideDown();
        }
    }

    // 打开一个书签目录项
    function closeBMItem(item) {
        item.isOpen = false;
        item.el.removeClass('open');

        if (item.sublistEl) {
            item.sublistEl.slideUp();
        }
    }

    // 创建一个书签节点
    function createBMItem(node) {
        var itemEl = $('<li class="bm-item"></li>'),
            itemTitleEl = $('<a class="bm-item-title">' + node.title + '</a>'),
            faviconEl = $('<i class="bm-item-favicon"></i>'),
            item;

        itemEl.append(itemTitleEl.prepend(faviconEl));

        itemEl.attr({
            'id': 'bmitem-' + node.id,
            'data-id': node.id,
            'data-index': node.index
        });

        itemEl.addClass(node.children ? 'bm-item-directory' : 'bm-item-bookmark');

        itemTitleEl.attr({
            href: node.url || 'javascript:'
        });

        if (node.url) {
            faviconEl.append('<img src="chrome://favicon/' + node.url + '">');
        }

        item = {
            id: node.id,
            el: itemEl,
            data: node
        };

        bmItems[node.id] = item;
        return item;
    }

    // 创建一个书签子列表
    function createBMSubList(item) {
        var listEl = $('<ul class="bm-sublist"></ul>');

        item.el.append(listEl);
        item.sublistEl = listEl;

        if (item.isOpen !== true) {
            listEl.css('display', 'none');
        }

        return listEl;
    }

    /**
     * 将一个书签项插入到书签列表中
     *
     * @param item {Object}
     *     书签项数据对象
     *
     * @param isCreatePath {Boolean}
     *     当节点父对象不存在时，是否要创建其父节点，
     *     若为 false，则会直接将该节点插入根列表下。
     */
    function insertItem(item, isCreatePath) {

        var pId = item.data.parentId,
            pItem = bmItems[pId];

        if (!pItem && isCreatePath) {
            chrome.bookmarks.get(pId + '', function(nodes) {
                var pNode = nodes && nodes[0];

                if (pNode && simpleBookmarks.isCorrectNode(pNode)) {
                    pItem = createBMItem(pNode);
                    insertItem(item, isCreatePath);
                }

                insert();
            });
        }
        else {
            insert();
        }

        function insert() {
            if (pItem) {
                if (!pItem.sublistEl) {
                    createBMSubList(pItem);
                }

                pItem.sublistEl.append(item.el);
            }
            else {
                bmRootList.append(item.el);
            }
        }
    }
});
