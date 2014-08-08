$(function() {
    'use strict';

    var doc = $(document),

        _rspace = /\s/g,
        _rseparator = /[\s-]/g,

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

    // 创建一个书签项
    function createBMItem(node) {
        var itemEl, item;

        if (!node.title) { return null; }

        if (node.children) {
            itemEl = createBMDirectoryItemEl(node);
        }
        else if (node.title.replace(_rspace, '').substring(0, 5) === '-----') {
            itemEl = createBMSeparatorItemEl(node);
        }
        else if (node.url) {
            itemEl = createBMBookmarkItemEl(node);
        }

        item = {
            id: node.id,
            el: itemEl,
            data: node
        };

        bmItems[node.id] = item;
        return item;
    }

    function createBMDirectoryItemEl(node) {
        return $(
            '<li id="bmitem-' + node.id + '" class="bm-item bm-item-directory"' +
                ' data-id="' + node.id + '"' +
                ' data-index="' + node.index + '">' +
                '<span class="bm-item-title">' +
                    '<i class="bm-item-favicon"></i>' +
                    node.title +
                '</span>' +
            '</li>'
        );
    }

    function createBMBookmarkItemEl(node) {
        return $(
            '<li id="bmitem-' + node.id + '" class="bm-item bm-item-bookmark"' +
                ' data-id="' + node.id + '"' +
                ' data-index="' + node.index + '">' +
                '<a class="bm-item-title" href="' + node.url + '">' +
                    '<i class="bm-item-favicon">' +
                        '<img src="chrome://favicon/' + node.url + '" />' +
                    '</i>' +
                    node.title +
                '</a>' +
            '</li>'
        );
    }

    function createBMSeparatorItemEl(node) {
        var title = node.title.replace(_rseparator, '');
        return $(
            '<li id="bmitem-' + node.id + '" class="bm-item bm-item-separator"' +
                ' data-id="' + node.id + '"' +
                ' data-index="' + node.index + '">' +
                '<span class="bm-item-title">' +
                    '<span class="line"></span>' +
                    '<span class="text">' + title + '</span>' +
                '</span>' +
            '</li>'
        );
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
        if (!item) { return; }

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
